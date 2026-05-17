const express = require('express');
const router = express.Router();
const { sequelize } = require('../db');

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY not configured'), { code: 'NO_KEY' });
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch {
    throw Object.assign(new Error('@anthropic-ai/sdk not installed — run npm install in server/'), { code: 'NO_SDK' });
  }
}

async function ask(prompt, maxTokens = 512) {
  const client = getClient();
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].text;
}

function handleAiError(err, res) {
  if (err.code === 'NO_KEY') return res.status(503).json({ error: 'AI not configured — add ANTHROPIC_API_KEY to server .env' });
  if (err.code === 'NO_SDK') return res.status(503).json({ error: err.message });
  console.error('AI error:', err.message);
  res.status(500).json({ error: 'AI request failed' });
}

// POST /api/ai/repair-notes
router.post('/repair-notes', async (req, res) => {
  try {
    const { deviceType, deviceBrand, deviceModel, issueDescription } = req.body;
    const device = [deviceBrand, deviceModel, deviceType].filter(Boolean).join(' ') || 'Unknown device';
    const text = await ask(
      `You are a certified wireless/electronics repair shop technician. Write a concise professional technician diagnosis note (2-3 sentences) for this repair ticket.\n` +
      `Device: ${device}\n` +
      `Customer reports: ${issueDescription || 'No description provided'}\n\n` +
      `Write only the diagnosis note, no preamble:`
    , 256);
    res.json({ text: text.trim() });
  } catch (err) { handleAiError(err, res); }
});

// POST /api/ai/sales-insights
router.post('/sales-insights', async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const [txRows] = await sequelize.query(
      `SELECT date(createdAt) as day, COUNT(*) as count, SUM(amount) as revenue, type
       FROM Transactions
       WHERE storeId = ? AND createdAt >= date('now', '-30 days')
       GROUP BY day, type ORDER BY day DESC LIMIT 60`,
      { replacements: [storeId] }
    );
    const [repairRows] = await sequelize.query(
      `SELECT status, COUNT(*) as count
       FROM RepairTickets
       WHERE storeId = ? AND createdAt >= date('now', '-30 days')
       GROUP BY status`,
      { replacements: [storeId] }
    );
    const totalRevenue = txRows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
    const txDays = [...new Set(txRows.map(r => r.day))].length;
    const repairSummary = repairRows.map(r => `${r.status}: ${r.count}`).join(', ') || 'no repairs';
    const summary = `${txDays} active transaction days, total revenue $${totalRevenue.toFixed(2)}. Repairs: ${repairSummary}.`;

    const text = await ask(
      `You are a business analyst for a small wireless/phone repair shop.\n` +
      `Based on this 30-day performance summary, give 3-4 specific, actionable insights and recommendations.\n\n` +
      `Data: ${summary}\n\n` +
      `Be direct and practical. Each insight on its own line starting with a bullet point:`
    , 512);
    res.json({ text: text.trim(), summary });
  } catch (err) { handleAiError(err, res); }
});

// POST /api/ai/inventory-forecast
router.post('/inventory-forecast', async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const [items] = await sequelize.query(
      `SELECT name, category, quantity, reorderPoint, cost, price
       FROM InventoryItems
       WHERE storeId = ? AND active = 1
       ORDER BY (CAST(quantity AS REAL) - COALESCE(reorderPoint, 0)) ASC
       LIMIT 25`,
      { replacements: [storeId] }
    );
    if (!items.length) return res.json({ text: 'No inventory items found. Add items to your inventory first.' });

    const itemList = items
      .map(i => `${i.name} (${i.category}): qty ${i.quantity}, reorder point ${i.reorderPoint || 0}`)
      .join('\n');

    const text = await ask(
      `You are an inventory specialist for a wireless/phone repair shop.\n` +
      `Review this inventory (sorted by lowest relative to reorder point first) and give actionable recommendations.\n\n` +
      `${itemList}\n\n` +
      `Provide: 1) Items to reorder NOW (at or below reorder point), 2) Items to watch, 3) One general stocking tip. Be concise:`
    , 512);
    res.json({ text: text.trim() });
  } catch (err) { handleAiError(err, res); }
});

// POST /api/ai/campaign-copy
router.post('/campaign-copy', async (req, res) => {
  try {
    const { type = 'sms', target = 'all', topic = 'promotion', tone = 'friendly' } = req.body;
    const audienceMap = {
      all:             'all customers',
      has_repairs:     'customers who have had phone repairs',
      loyalty_members: 'loyalty reward members',
      inactive_90days: 'customers inactive for 90+ days (win-back)',
    };
    const audience = audienceMap[target] || 'all customers';
    const isSms = type === 'sms';

    const text = await ask(
      `You are a marketing copywriter for CellTechPOS, a wireless/phone repair shop.\n` +
      `Write a ${isSms ? 'single SMS message (under 155 characters, no emojis)' : 'short email body (2 short paragraphs, no subject line)'} targeting ${audience}.\n` +
      `Topic: ${topic}\nTone: ${tone}\n\n` +
      `${isSms ? 'SMS (155 chars max):' : 'Email body:'}`
    , isSms ? 200 : 400);
    res.json({ text: text.trim() });
  } catch (err) { handleAiError(err, res); }
});

module.exports = router;
