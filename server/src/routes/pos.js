const router = require('express').Router();
const { sequelize } = require('../db');
const { Transaction, TransactionItem, InventoryItem, Customer, Store } = require('../db/models');
const { auth } = require('../middleware/auth');
const webpos = require('../integrations/webpos');

function txNumber() {
  return 'TXN-' + Date.now().toString().slice(-8);
}

// Process a sale
router.post('/sale', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { customerId, items, paymentMethod, paymentRef, notes, discountAmount = 0 } = req.body;

    const store = await Store.findByPk(req.user.storeId);
    if (!store) throw new Error('Store not found');

    let subtotal = 0;
    const resolvedItems = [];

    for (const li of items) {
      const inv = await InventoryItem.findOne({ where: { id: li.itemId, storeId: req.user.storeId }, transaction: t });
      if (!inv) throw new Error(`Item ${li.itemId} not found`);
      if (inv.category !== 'service' && inv.quantity < li.quantity) {
        throw new Error(`Insufficient stock for ${inv.name}`);
      }
      const lineTotal = (parseFloat(li.unitPrice ?? inv.price)) * li.quantity;
      subtotal += lineTotal;
      resolvedItems.push({ inv, li, lineTotal });
    }

    const taxAmount = parseFloat(((subtotal - discountAmount) * store.taxRate).toFixed(2));
    const total = subtotal - discountAmount + taxAmount;

    // Process payment via integration if needed
    let referenceNumber = paymentRef;
    if (paymentMethod === 'webpos') {
      const result = await webpos.processPayment({ amount: total, reference: txNumber() });
      referenceNumber = result.referenceNumber;
    }

    const tx = await Transaction.create({
      transactionNumber: txNumber(),
      storeId: req.user.storeId,
      customerId: customerId || null,
      userId: req.user.id,
      type: 'sale',
      subtotal,
      taxAmount,
      discountAmount,
      total,
      paymentMethod,
      paymentStatus: 'completed',
      referenceNumber,
      notes,
    }, { transaction: t });

    for (const { inv, li, lineTotal } of resolvedItems) {
      await TransactionItem.create({
        transactionId: tx.id,
        itemId: inv.id,
        name: inv.name,
        quantity: li.quantity,
        unitPrice: li.unitPrice ?? inv.price,
        discount: li.discount ?? 0,
        total: lineTotal,
      }, { transaction: t });
      if (inv.category !== 'service') {
        await inv.decrement('quantity', { by: li.quantity, transaction: t });
      }
    }

    await t.commit();
    res.status(201).json({ transaction: tx, total, taxAmount, subtotal });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
});

// Process repair payment
router.post('/repair-payment', auth, async (req, res) => {
  const { repairId, amount, paymentMethod, notes } = req.body;
  const tx = await Transaction.create({
    transactionNumber: txNumber(),
    storeId: req.user.storeId,
    userId: req.user.id,
    repairId,
    type: 'repair_payment',
    subtotal: amount,
    taxAmount: 0,
    total: amount,
    paymentMethod,
    paymentStatus: 'completed',
    notes,
  });
  res.status(201).json(tx);
});

// List transactions
router.get('/transactions', auth, async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const where = { storeId: req.user.storeId };
  if (type) where.type = type;
  const { rows, count } = await Transaction.findAndCountAll({
    where,
    include: [{ model: Customer }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  res.json({ transactions: rows, total: count, page: parseInt(page) });
});

router.get('/transactions/:id', auth, async (req, res) => {
  const tx = await Transaction.findOne({
    where: { id: req.params.id, storeId: req.user.storeId },
    include: [
      { model: Customer },
      { model: TransactionItem },
    ],
  });
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

module.exports = router;
