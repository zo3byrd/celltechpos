const router = require('express').Router();
const { Op, sequelize: db } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PurchaseOrder, PurchaseOrderItem, Supplier, InventoryItem, User } = require('../db/models');

router.use(authenticate);

function poNum() {
  return 'PO-' + Date.now().toString(36).toUpperCase();
}

router.get('/', async (req, res) => {
  try {
    const { status, supplierId, limit = 20, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    const rows = await PurchaseOrder.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [
        { model: Supplier, attributes: ['id', 'name'], required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ orders: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Supplier, required: false },
        { model: User, attributes: ['id', 'name'], required: false },
        { model: PurchaseOrderItem, as: 'items', include: [{ model: InventoryItem, as: 'item', attributes: ['id', 'name', 'sku', 'quantity'], required: false }] },
      ],
    });
    if (!po) return res.status(404).json({ error: 'Not found' });
    res.json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { items = [], ...rest } = req.body;
    const po = await PurchaseOrder.create({ ...rest, storeId: req.user.storeId, userId: req.user.id, poNumber: poNum() });
    for (const item of items) {
      await PurchaseOrderItem.create({ ...item, poId: po.id, totalCost: item.orderedQty * item.unitCost });
    }
    const total = items.reduce((s, i) => s + i.orderedQty * i.unitCost, 0);
    await po.update({ totalAmount: total });
    res.status(201).json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!po) return res.status(404).json({ error: 'Not found' });
    await po.update(req.body);
    res.json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/receive', requireAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });
    if (!po) return res.status(404).json({ error: 'Not found' });
    const { receivedItems = [] } = req.body;
    for (const ri of receivedItems) {
      const poItem = po.items.find(i => i.id === ri.id);
      if (!poItem) continue;
      const newReceived = poItem.receivedQty + ri.qty;
      await poItem.update({ receivedQty: newReceived });
      if (poItem.itemId) {
        const invItem = await InventoryItem.findByPk(poItem.itemId);
        if (invItem) await invItem.update({ quantity: invItem.quantity + ri.qty });
      }
    }
    const allReceived = po.items.every(i => i.receivedQty >= i.orderedQty);
    const anyReceived = po.items.some(i => i.receivedQty > 0);
    await po.update({
      status: allReceived ? 'received' : (anyReceived ? 'partial' : 'ordered'),
      receivedAt: allReceived ? new Date() : po.receivedAt,
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
