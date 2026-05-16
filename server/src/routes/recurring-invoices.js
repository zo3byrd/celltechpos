const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { RecurringInvoice, Invoice, Customer, User } = require('../db/models');

router.use(auth);

function invNum() { return 'INV-' + Date.now().toString().slice(-7); }

function calcTotals(items, taxRate) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty || 1) * parseFloat(i.unitPrice || 0)), 0);
  const taxAmount = subtotal * parseFloat(taxRate || 0);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

function nextDate(from, frequency) {
  const d = new Date(from);
  switch (frequency) {
    case 'weekly':    d.setDate(d.getDate() + 7); break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

const include = [
  { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
  { model: User,     attributes: ['id', 'name'] },
];

// GET all recurring invoices
router.get('/', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    const rows = await RecurringInvoice.findAndCountAll({
      where, include,
      order: [['nextBillingDate', 'ASC']],
      limit: parseInt(limit), offset: parseInt(offset),
    });
    res.json({ recurring: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const r = await RecurringInvoice.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [...include, { model: Invoice, as: 'invoices', include: [{ model: Customer, attributes: ['id','firstName','lastName'] }], order: [['createdAt','DESC']] }],
    });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { customerId, name, lineItems = [], taxRate = 0, frequency = 'monthly', startDate, dueDays = 30, notes } = req.body;
    const items = Array.isArray(lineItems) ? lineItems : JSON.parse(lineItems || '[]');
    const { subtotal, taxAmount, total } = calcTotals(items, taxRate);
    const start = startDate || new Date().toISOString().slice(0, 10);
    const r = await RecurringInvoice.create({
      id: uuidv4(),
      storeId: req.user.storeId,
      userId: req.user.id,
      customerId: customerId || null,
      name, frequency,
      lineItemsJson: JSON.stringify(items),
      subtotal, taxRate: parseFloat(taxRate), taxAmount, total,
      startDate: start,
      nextBillingDate: start,
      dueDays: parseInt(dueDays),
      notes,
    });
    res.status(201).json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const r = await RecurringInvoice.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!r) return res.status(404).json({ error: 'Not found' });
    const { lineItems, taxRate, ...rest } = req.body;
    if (lineItems !== undefined) {
      const items = Array.isArray(lineItems) ? lineItems : JSON.parse(lineItems || '[]');
      const tr = taxRate !== undefined ? taxRate : r.taxRate;
      const { subtotal, taxAmount, total } = calcTotals(items, tr);
      await r.update({ ...rest, lineItemsJson: JSON.stringify(items), taxRate: parseFloat(tr), subtotal, taxAmount, total });
    } else {
      await r.update(rest);
    }
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST bill-now — generate an invoice immediately
router.post('/:id/bill-now', async (req, res) => {
  try {
    const r = await RecurringInvoice.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!r) return res.status(404).json({ error: 'Not found' });

    const items = JSON.parse(r.lineItemsJson || '[]');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (r.dueDays || 30));

    const inv = await Invoice.create({
      id: uuidv4(),
      storeId: r.storeId,
      customerId: r.customerId,
      userId: req.user.id,
      recurringId: r.id,
      invoiceNumber: invNum(),
      status: 'sent',
      lineItemsJson: r.lineItemsJson,
      subtotal: r.subtotal,
      taxRate: r.taxRate,
      taxAmount: r.taxAmount,
      total: r.total,
      dueDate: dueDate.toISOString().slice(0, 10),
      sentAt: new Date(),
      notes: r.notes,
    });

    const today = new Date().toISOString().slice(0, 10);
    await r.update({
      lastBilledDate: today,
      nextBillingDate: nextDate(today, r.frequency),
      billingCount: (r.billingCount || 0) + 1,
    });

    res.json({ invoice: inv, recurring: r });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET invoices generated from a recurring template
router.get('/:id/invoices', async (req, res) => {
  try {
    const invs = await Invoice.findAll({
      where: { recurringId: req.params.id, storeId: req.user.storeId },
      order: [['createdAt', 'DESC']],
    });
    res.json(invs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const r = await RecurringInvoice.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!r) return res.status(404).json({ error: 'Not found' });
    await r.destroy();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all invoices (standalone)
router.get('/invoices/all', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    const rows = await Invoice.findAndCountAll({
      where,
      include: [{ model: Customer, attributes: ['id','firstName','lastName','phone','email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: parseInt(offset),
    });
    res.json({ invoices: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark invoice paid
router.put('/invoices/:invId/pay', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.invId, storeId: req.user.storeId } });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const { paymentMethod = 'cash', amount } = req.body;
    await inv.update({
      status: 'paid',
      paidAt: new Date(),
      paidAmount: parseFloat(amount) || inv.total,
      paymentMethod,
    });
    res.json(inv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
