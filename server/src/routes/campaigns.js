const router = require('express').Router();
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Campaign, Customer, LoyaltyAccount } = require('../db/models');
const { sendEmail, sendSMS, emailHtml } = require('../integrations/messaging');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { storeId: req.user.storeId },
      order: [['createdAt', 'DESC']],
    });
    res.json(campaigns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const c = await Campaign.create({ ...req.body, storeId: req.user.storeId, userId: req.user.id });
    res.status(201).json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const c = await Campaign.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    await c.update(req.body);
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function getAudienceCustomers(storeId, target, type) {
  const contactField = type === 'sms' ? 'phone' : 'email';
  const baseWhere = { storeId, [contactField]: { [Op.not]: null, [Op.ne]: '' } };

  if (target === 'all') {
    return Customer.findAll({ where: baseWhere, attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] });
  }
  if (target === 'loyalty_members') {
    const accounts = await LoyaltyAccount.findAll({ where: { storeId, active: true }, attributes: ['customerId'] });
    const ids = accounts.map(a => a.customerId);
    return Customer.findAll({ where: { ...baseWhere, id: { [Op.in]: ids } }, attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] });
  }
  if (target === 'has_repairs') {
    const [rows] = await sequelize.query(
      `SELECT DISTINCT customerId FROM RepairTickets WHERE storeId=?`,
      { replacements: [storeId] }
    );
    const ids = rows.map(r => r.customerId);
    return Customer.findAll({ where: { ...baseWhere, id: { [Op.in]: ids } }, attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] });
  }
  if (target === 'inactive_90days') {
    const [rows] = await sequelize.query(
      `SELECT id FROM Customers WHERE storeId=? AND id NOT IN (
         SELECT DISTINCT customerId FROM Transactions
         WHERE storeId=? AND createdAt >= datetime('now','-90 days') AND customerId IS NOT NULL
       )`,
      { replacements: [storeId, storeId] }
    );
    const ids = rows.map(r => r.id);
    return Customer.findAll({ where: { ...baseWhere, id: { [Op.in]: ids } }, attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] });
  }
  return [];
}

function applyVars(text, customer, storeName) {
  return (text || '')
    .replace(/\{\{firstName\}\}/gi, customer.firstName || '')
    .replace(/\{\{lastName\}\}/gi, customer.lastName || '')
    .replace(/\{\{name\}\}/gi, `${customer.firstName || ''} ${customer.lastName || ''}`.trim())
    .replace(/\{\{storeName\}\}/gi, storeName || 'CellTechPOS');
}

router.post('/:id/preview', async (req, res) => {
  try {
    const c = await Campaign.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    const customers = await getAudienceCustomers(req.user.storeId, c.target, c.type);
    res.json({ recipientCount: customers.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const c = await Campaign.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.status === 'sent') return res.status(400).json({ error: 'Already sent' });

    const customers = await getAudienceCustomers(req.user.storeId, c.target, c.type);

    // Get store name for template vars
    const [storeRows] = await sequelize.query('SELECT name FROM Stores WHERE id=? LIMIT 1', { replacements: [req.user.storeId] });
    const storeName = storeRows[0]?.name || 'CellTechPOS';

    let sent = 0, failed = 0;

    for (const customer of customers) {
      const body = applyVars(c.message, customer, storeName);
      try {
        if (c.type === 'email' && customer.email) {
          const subject = applyVars(c.subject || c.name, customer, storeName);
          const html = emailHtml(body, storeName);
          await sendEmail(customer.email, subject, html, body);
          sent++;
        } else if (c.type === 'sms' && customer.phone) {
          await sendSMS(customer.phone, body);
          sent++;
        }
      } catch {
        failed++;
      }
    }

    await c.update({ status: 'sent', sentAt: new Date(), recipientCount: sent + failed });
    res.json({ ok: true, sent, failed, recipientCount: sent + failed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const c = await Campaign.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    await c.update({ status: 'cancelled' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
