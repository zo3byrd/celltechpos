const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Campaign, Customer, LoyaltyAccount } = require('../db/models');

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

router.post('/:id/preview', async (req, res) => {
  try {
    const c = await Campaign.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    let count = 0;
    if (c.target === 'all') {
      count = await Customer.count({ where: { storeId: req.user.storeId } });
    } else if (c.target === 'loyalty_members') {
      count = await LoyaltyAccount.count({ where: { storeId: req.user.storeId, active: true } });
    } else {
      count = await Customer.count({ where: { storeId: req.user.storeId } });
    }
    res.json({ recipientCount: count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const c = await Campaign.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.status === 'sent') return res.status(400).json({ error: 'Already sent' });
    let count = await Customer.count({ where: { storeId: req.user.storeId } });
    // In a real implementation: send emails/SMS here via nodemailer/twilio
    await c.update({ status: 'sent', sentAt: new Date(), recipientCount: count });
    res.json({ ok: true, recipientCount: count, message: 'Campaign marked as sent. Configure SMTP/Twilio in Admin to actually send messages.' });
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
