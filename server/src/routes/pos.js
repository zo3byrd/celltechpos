const router = require('express').Router();
const { sequelize } = require('../db');
const { Transaction, TransactionItem, InventoryItem, Customer, Store, GiftCard } = require('../db/models');
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

    // Category-aware tax
    const taxConfig = store.taxConfigJson ? JSON.parse(store.taxConfigJson) : null;
    let taxableSubtotal = 0;
    for (const { inv, lineTotal } of resolvedItems) {
      const taxable = taxConfig ? taxConfig[inv.category] !== false : true;
      if (taxable) taxableSubtotal += lineTotal;
    }
    const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
    const taxableAfterDiscount = taxableSubtotal * discountRatio;
    const taxAmount = parseFloat((taxableAfterDiscount * store.taxRate).toFixed(2));
    const total = subtotal - discountAmount + taxAmount;

    // Gift card validation
    let giftCard = null;
    if (paymentMethod === 'gift_card') {
      const code = req.body.giftCardCode;
      if (!code) throw new Error('Gift card code required');
      giftCard = await GiftCard.findOne({ where: { code: code.toUpperCase(), storeId: req.user.storeId, status: 'active' }, transaction: t });
      if (!giftCard) throw new Error('Gift card not found or not active');
      if (parseFloat(giftCard.balance) < total) {
        throw new Error(`Insufficient gift card balance. Available: $${parseFloat(giftCard.balance).toFixed(2)}, needed: $${total.toFixed(2)}`);
      }
    }

    // Process payment via integration if needed
    let referenceNumber = paymentRef;
    if (paymentMethod === 'webpos') {
      const result = await webpos.processPayment({ amount: total, reference: txNumber() });
      referenceNumber = result.referenceNumber;
    }
    if (paymentMethod === 'gift_card' && giftCard) {
      referenceNumber = giftCard.code;
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

    // Deduct gift card balance
    if (giftCard) {
      const newBalance = parseFloat(giftCard.balance) - total;
      await giftCard.update({ balance: newBalance, status: newBalance <= 0 ? 'depleted' : 'active' }, { transaction: t });
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
  const { Op } = require('sequelize');
  const { page = 1, limit = 20, type, search } = req.query;
  const where = { storeId: req.user.storeId };
  if (type) where.type = type;
  if (search) {
    // Find customer IDs matching the search term
    const [custRows] = await sequelize.query(
      `SELECT id FROM Customers WHERE storeId=? AND (firstName LIKE ? OR lastName LIKE ? OR (firstName || ' ' || lastName) LIKE ?)`,
      { replacements: [req.user.storeId, `%${search}%`, `%${search}%`, `%${search}%`] }
    );
    const custIds = custRows.map(r => r.id);
    const orClauses = [{ transactionNumber: { [Op.like]: `%${search}%` } }];
    if (custIds.length) orClauses.push({ customerId: { [Op.in]: custIds } });
    where[Op.or] = orClauses;
  }
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

// Process a refund / return
router.post('/refund', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { originalTransactionId, items, reason, refundMethod, notes } = req.body;
    if (!originalTransactionId || !items?.length) {
      return res.status(400).json({ error: 'originalTransactionId and items are required' });
    }

    // Load original transaction + its items
    const original = await Transaction.findOne({
      where: { id: originalTransactionId, storeId: req.user.storeId },
      include: [{ model: TransactionItem }],
    });
    if (!original) return res.status(404).json({ error: 'Original transaction not found' });
    if (original.type === 'refund') return res.status(400).json({ error: 'Cannot refund a refund' });

    // Sum quantities already refunded per item
    const existingRefunds = await TransactionItem.findAll({
      include: [{
        model: Transaction,
        where: { originalTransactionId, storeId: req.user.storeId, type: 'refund' },
        attributes: [],
      }],
    });
    const alreadyRefunded = {};
    for (const ri of existingRefunds) {
      alreadyRefunded[ri.itemId] = (alreadyRefunded[ri.itemId] || 0) + ri.quantity;
    }

    // Validate each item to refund
    let refundSubtotal = 0;
    const resolvedItems = [];
    for (const li of items) {
      const orig = original.TransactionItems.find(ti => ti.itemId === li.itemId);
      if (!orig) return res.status(400).json({ error: `Item ${li.itemId} not in original transaction` });
      const maxRefundable = orig.quantity - (alreadyRefunded[li.itemId] || 0);
      if (li.quantity > maxRefundable) {
        return res.status(400).json({ error: `Cannot refund ${li.quantity} of "${orig.name}" — only ${maxRefundable} refundable` });
      }
      const lineTotal = parseFloat(orig.unitPrice) * li.quantity;
      refundSubtotal += lineTotal;
      resolvedItems.push({ orig, quantity: li.quantity, lineTotal });
    }

    const refundTotal = refundSubtotal;

    const refundTx = await Transaction.create({
      transactionNumber: 'REF-' + Date.now().toString().slice(-8),
      storeId: req.user.storeId,
      customerId: original.customerId || null,
      userId: req.user.id,
      type: 'refund',
      subtotal: -refundSubtotal,
      taxAmount: 0,
      discountAmount: 0,
      total: -refundTotal,
      paymentMethod: refundMethod || original.paymentMethod,
      paymentStatus: 'completed',
      originalTransactionId,
      reason: reason || null,
      notes: notes || `Refund for ${original.transactionNumber}`,
    }, { transaction: t });

    for (const { orig, quantity, lineTotal } of resolvedItems) {
      await TransactionItem.create({
        transactionId: refundTx.id,
        itemId: orig.itemId,
        name: orig.name,
        quantity,
        unitPrice: orig.unitPrice,
        discount: 0,
        total: -lineTotal,
      }, { transaction: t });

      // Restock non-service items
      if (orig.itemId) {
        const inv = await InventoryItem.findOne({ where: { id: orig.itemId, storeId: req.user.storeId }, transaction: t });
        if (inv && inv.category !== 'service') {
          await inv.increment('quantity', { by: quantity, transaction: t });
        }
      }
    }

    await t.commit();
    res.status(201).json({ refund: refundTx, total: -refundTotal });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
});

// Get refunds for a transaction
router.get('/transactions/:id/refunds', auth, async (req, res) => {
  const refunds = await Transaction.findAll({
    where: { originalTransactionId: req.params.id, storeId: req.user.storeId, type: 'refund' },
    include: [{ model: TransactionItem }],
    order: [['createdAt', 'DESC']],
  });
  res.json(refunds);
});

// Public store info for receipt printing (any authenticated user)
router.get('/store-info', auth, async (req, res) => {
  const store = await Store.findByPk(req.user.storeId, {
    attributes: ['id', 'name', 'address', 'city', 'state', 'zip', 'phone', 'email', 'logoUrl', 'receiptPolicy', 'taxRate', 'taxConfigJson'],
  });
  res.json(store || {});
});

// Send receipt via SMS or email
router.post('/send-receipt', auth, async (req, res) => {
  const { sendSMS, sendEmail, emailHtml } = require('../integrations/messaging');
  const { method, to, transactionNumber, storeName, storeAddress, storePhone, logoUrl, receiptPolicy,
          items, subtotal, taxAmount, discountAmount, total, paymentMethod } = req.body;

  if (!method || !to) return res.status(400).json({ error: 'method and to are required' });

  const fmtMoney = n => '$' + parseFloat(n || 0).toFixed(2);
  const name = storeName || 'Cell 4 Less Repair';
  const date = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  try {
    if (method === 'sms') {
      const itemLines = (items || []).map(i => `${i.name} x${i.qty}  ${fmtMoney(i.unitPrice * i.qty)}`).join('\n');
      const lines = [
        name,
        storeAddress || null,
        storePhone || null,
        `Receipt: ${transactionNumber}`,
        date, '',
        itemLines, '',
        `Subtotal: ${fmtMoney(subtotal)}`,
        discountAmount > 0 ? `Discount: -${fmtMoney(discountAmount)}` : null,
        `Tax: ${fmtMoney(taxAmount)}`,
        `TOTAL: ${fmtMoney(total)}`,
        `Payment: ${paymentMethod}`,
        '',
        receiptPolicy || 'Thank you for your business!',
      ].filter(l => l !== null).join('\n');
      await sendSMS(to, lines);

    } else if (method === 'email') {
      const logoHtml = logoUrl
        ? `<div style="text-align:center;margin-bottom:16px"><img src="${logoUrl}" alt="${name}" style="max-height:80px;max-width:200px;object-fit:contain"/></div>`
        : '';
      const addrLine = [storeAddress, storePhone].filter(Boolean).join(' · ');
      const rows = (items || []).map(i => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${i.name}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:center">${i.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right">${fmtMoney(i.unitPrice * i.qty)}</td>
        </tr>`).join('');
      const discRow = discountAmount > 0
        ? `<tr><td style="padding:4px 8px;color:#16a34a">Discount</td><td></td><td style="padding:4px 8px;text-align:right;color:#16a34a">-${fmtMoney(discountAmount)}</td></tr>` : '';
      const policyHtml = receiptPolicy
        ? `<div style="margin-top:20px;padding:12px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;white-space:pre-wrap">${receiptPolicy}</div>`
        : '';
      const body = `
        ${logoHtml}
        ${addrLine ? `<p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-align:center">${addrLine}</p>` : ''}
        <p style="margin:8px 0;color:#6b7280;font-size:13px">${date}</p>
        <p style="margin:0 0 16px;font-size:13px">Transaction: <strong>${transactionNumber}</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Item</th>
              <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Qty</th>
              <th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table style="width:100%;margin-top:12px;font-size:14px">
          <tr><td style="padding:4px 8px;color:#6b7280">Subtotal</td><td></td><td style="padding:4px 8px;text-align:right">${fmtMoney(subtotal)}</td></tr>
          ${discRow}
          <tr><td style="padding:4px 8px;color:#6b7280">Tax</td><td></td><td style="padding:4px 8px;text-align:right">${fmtMoney(taxAmount)}</td></tr>
          <tr style="font-weight:bold;font-size:16px;border-top:2px solid #e5e7eb">
            <td style="padding:8px">Total</td><td></td>
            <td style="padding:8px;text-align:right;color:#15803d">${fmtMoney(total)}</td>
          </tr>
          <tr><td style="padding:4px 8px;color:#6b7280">Payment</td><td></td><td style="padding:4px 8px;text-align:right;text-transform:capitalize">${paymentMethod}</td></tr>
        </table>
        ${policyHtml}`;
      await sendEmail(to, `Receipt from ${name} — ${transactionNumber}`, emailHtml(body, name, storePhone));

    } else {
      return res.status(400).json({ error: 'method must be sms or email' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
