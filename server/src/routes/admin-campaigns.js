const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { AdminCampaign, License, Store } = require('../db/models');
const { sendEmail } = require('../integrations/messaging');
const { Op } = require('sequelize');

const superadminOnly = [auth, requireRole('superadmin')];

// Build recipient list based on target
async function getRecipients(target) {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let licenseWhere = {};
  if (target === 'active')       licenseWhere = { status: 'active' };
  if (target === 'expired')      licenseWhere = { status: 'expired' };
  if (target === 'monthly')      licenseWhere = { plan: 'monthly' };
  if (target === 'yearly')       licenseWhere = { plan: 'yearly' };
  if (target === 'trial')        licenseWhere = { plan: 'trial' };
  if (target === 'expiring_30')  licenseWhere = {
    status: 'active',
    expiresAt: { [Op.between]: [now.toISOString(), in30.toISOString()] },
  };

  const licenses = await License.findAll({
    where: licenseWhere,
    include: [{ model: Store, attributes: ['id', 'name', 'email', 'phone'] }],
  });

  return licenses
    .filter(l => l.Store && l.Store.email)
    .map(l => ({
      email:     l.Store.email,
      storeName: l.Store.name,
      plan:      l.plan,
      expiresAt: l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : 'N/A',
      storeId:   l.storeId,
    }));
}

function applyVars(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

function buildHtml(body, fromName) {
  const escaped = body.replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937">
<div style="border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:20px">
  <h2 style="margin:0;color:#6366f1">${fromName || 'CellTechPOS'}</h2>
</div>
<div style="font-size:15px;line-height:1.6">${escaped}</div>
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
  This message was sent from ${fromName || 'CellTechPOS'}.
</div></body></html>`;
}

// GET / — list all campaigns
router.get('/', ...superadminOnly, async (req, res) => {
  const rows = await AdminCampaign.findAll({ order: [['createdAt', 'DESC']] });
  res.json(rows);
});

// GET /preview?target=all — count recipients without sending
router.get('/preview', ...superadminOnly, async (req, res) => {
  const { target = 'all' } = req.query;
  const recipients = await getRecipients(target);
  res.json({ count: recipients.length, sample: recipients.slice(0, 5) });
});

// POST / — create a draft campaign
router.post('/', ...superadminOnly, async (req, res) => {
  const { subject, fromName, body, target } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });

  const campaign = await AdminCampaign.create({
    subject, fromName: fromName || 'CellTechPOS', body,
    target: target || 'all',
    status: 'draft',
    sentBy: req.user.id,
  });
  res.status(201).json(campaign);
});

// PUT /:id — update a draft
router.put('/:id', ...superadminOnly, async (req, res) => {
  const campaign = await AdminCampaign.findByPk(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  if (campaign.status !== 'draft') return res.status(400).json({ error: 'Only drafts can be edited' });

  const { subject, fromName, body, target } = req.body;
  await campaign.update({ subject, fromName, body, target });
  res.json(campaign);
});

// DELETE /:id — delete a draft
router.delete('/:id', ...superadminOnly, async (req, res) => {
  const campaign = await AdminCampaign.findByPk(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  if (campaign.status !== 'draft') return res.status(400).json({ error: 'Only drafts can be deleted' });
  await campaign.destroy();
  res.json({ ok: true });
});

// POST /:id/send — send a campaign
router.post('/:id/send', ...superadminOnly, async (req, res) => {
  const campaign = await AdminCampaign.findByPk(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  if (campaign.status === 'sending') return res.status(400).json({ error: 'Already sending' });
  if (campaign.status === 'sent')    return res.status(400).json({ error: 'Already sent' });

  await campaign.update({ status: 'sending' });

  // Respond immediately — sending happens in background
  res.json({ ok: true, message: 'Campaign sending started' });

  const recipients = await getRecipients(campaign.target);
  let success = 0;
  let fail = 0;

  for (const r of recipients) {
    const vars = {
      storeName: r.storeName,
      ownerEmail: r.email,
      plan: r.plan,
      expiresAt: r.expiresAt,
    };
    try {
      const subject = applyVars(campaign.subject, vars);
      const bodyText = applyVars(campaign.body, vars);
      const html = buildHtml(bodyText, campaign.fromName);
      await sendEmail(r.email, subject, html, bodyText);
      success++;
    } catch {
      fail++;
    }
  }

  await campaign.update({
    status: recipients.length === 0 ? 'sent' : (fail === recipients.length ? 'failed' : 'sent'),
    sentAt: new Date(),
    recipientCount: recipients.length,
    successCount: success,
    failCount: fail,
  });
});

module.exports = router;
