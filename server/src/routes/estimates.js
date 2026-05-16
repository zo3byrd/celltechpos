const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const { Estimate, Customer, User, RepairTicket } = require('../db/models');

router.use(auth);

function estNum() {
  return 'EST-' + Date.now().toString().slice(-6);
}

function calcTotals(lineItems, taxRate) {
  const subtotal = lineItems.reduce((s, i) => s + (parseFloat(i.qty || 1) * parseFloat(i.unitPrice || 0)), 0);
  const taxAmount = subtotal * parseFloat(taxRate || 0);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

// GET all
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    const rows = await Estimate.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ estimates: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const e = await Estimate.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, attributes: ['id', 'name'] },
        { model: RepairTicket, as: 'repair', attributes: ['id', 'ticketNumber', 'deviceBrand', 'deviceModel'] },
      ],
    });
    if (!e) return res.status(404).json({ error: 'Not found' });
    res.json(e);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { customerId, repairId, lineItems = [], taxRate = 0, notes, validDays = 30, status = 'draft' } = req.body;
    const items = Array.isArray(lineItems) ? lineItems : JSON.parse(lineItems || '[]');
    const { subtotal, taxAmount, total } = calcTotals(items, taxRate);
    const validUntil = new Date(Date.now() + validDays * 86400000);
    const e = await Estimate.create({
      id: uuidv4(),
      storeId: req.user.storeId,
      userId: req.user.id,
      customerId: customerId || null,
      repairId: repairId || null,
      estimateNumber: estNum(),
      status,
      lineItemsJson: JSON.stringify(items),
      subtotal, taxRate: parseFloat(taxRate), taxAmount, total,
      notes, validDays, validUntil,
      approvalToken: crypto.randomBytes(16).toString('hex'),
    });
    res.status(201).json(e);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const e = await Estimate.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!e) return res.status(404).json({ error: 'Not found' });
    const { lineItems, taxRate, ...rest } = req.body;
    if (lineItems !== undefined) {
      const items = Array.isArray(lineItems) ? lineItems : JSON.parse(lineItems || '[]');
      const { subtotal, taxAmount, total } = calcTotals(items, taxRate !== undefined ? taxRate : e.taxRate);
      await e.update({ ...rest, lineItemsJson: JSON.stringify(items), taxRate: parseFloat(taxRate || e.taxRate), subtotal, taxAmount, total });
    } else {
      await e.update(rest);
    }
    res.json(e);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST send (mark as sent, return approval link)
router.post('/:id/send', async (req, res) => {
  try {
    const e = await Estimate.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!e) return res.status(404).json({ error: 'Not found' });
    await e.update({ status: 'sent', sentAt: new Date() });
    const link = `${process.env.BASE_URL || 'https://celltechpos.com'}/estimate/${e.approvalToken}`;
    res.json({ ok: true, link });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const e = await Estimate.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!e) return res.status(404).json({ error: 'Not found' });
    await e.destroy();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
