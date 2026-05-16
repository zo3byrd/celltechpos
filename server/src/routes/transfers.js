const router = require('express').Router();
const { Op } = require('sequelize');
const { StoreTransfer, InventoryItem, Store, User } = require('../db/models');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {
      [Op.or]: [{ fromStoreId: req.user.storeId }, { toStoreId: req.user.storeId }],
    };
    if (status) where.status = status;
    const transfers = await StoreTransfer.findAll({
      where,
      include: [
        { model: InventoryItem, as: 'item', attributes: ['id', 'name', 'sku', 'quantity'], required: false },
        { model: Store, as: 'fromStore', attributes: ['id', 'name'], required: false },
        { model: Store, as: 'toStore', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(transfers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { itemId, toStoreId, quantity, notes } = req.body;
    const item = await InventoryItem.findOne({ where: { id: itemId, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.quantity < quantity) return res.status(400).json({ error: `Only ${item.quantity} in stock` });
    const transfer = await StoreTransfer.create({
      fromStoreId: req.user.storeId,
      toStoreId,
      itemId,
      quantity,
      requestedBy: req.user.id,
      notes,
    });
    res.status(201).json(transfer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const transfer = await StoreTransfer.findOne({ where: { id: req.params.id, fromStoreId: req.user.storeId, status: 'pending' } });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found or not pending' });
    await transfer.update({ status: 'approved', approvedBy: req.user.id });
    res.json(transfer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/ship', requireAdmin, async (req, res) => {
  try {
    const transfer = await StoreTransfer.findOne({ where: { id: req.params.id, fromStoreId: req.user.storeId, status: 'approved' } });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found or not approved' });
    const item = await InventoryItem.findOne({ where: { id: transfer.itemId, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.quantity < transfer.quantity) return res.status(400).json({ error: `Only ${item.quantity} in stock` });
    await item.decrement('quantity', { by: transfer.quantity });
    await transfer.update({ status: 'shipped', shippedAt: new Date() });
    res.json(transfer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/receive', requireAdmin, async (req, res) => {
  try {
    const transfer = await StoreTransfer.findOne({ where: { id: req.params.id, toStoreId: req.user.storeId, status: 'shipped' } });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found or not shipped' });
    const item = await InventoryItem.findOne({ where: { id: transfer.itemId, storeId: req.user.storeId } });
    if (item) {
      await item.increment('quantity', { by: transfer.quantity });
    } else {
      const srcItem = await InventoryItem.findByPk(transfer.itemId);
      if (srcItem) {
        await InventoryItem.create({ ...srcItem.toJSON(), id: undefined, storeId: req.user.storeId, quantity: transfer.quantity });
      }
    }
    await transfer.update({ status: 'received', receivedAt: new Date() });
    res.json(transfer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const transfer = await StoreTransfer.findOne({
      where: { id: req.params.id, fromStoreId: req.user.storeId, status: { [Op.in]: ['pending', 'approved'] } },
    });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found or cannot be cancelled' });
    await transfer.update({ status: 'cancelled' });
    res.json(transfer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
