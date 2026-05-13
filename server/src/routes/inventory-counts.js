const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { InventoryCount, InventoryCountItem, InventoryItem, User } = require('../db/models');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const counts = await InventoryCount.findAll({
      where: { storeId: req.user.storeId },
      include: [{ model: User, attributes: ['id', 'name'], required: false }],
      order: [['createdAt', 'DESC']],
    });
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, notes } = req.body;
    const count = await InventoryCount.create({ name, notes, storeId: req.user.storeId, userId: req.user.id });
    const items = await InventoryItem.findAll({ where: { storeId: req.user.storeId, active: true } });
    for (const item of items) {
      await InventoryCountItem.create({ countId: count.id, itemId: item.id, expectedQty: item.quantity });
    }
    res.status(201).json(count);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const count = await InventoryCount.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: User, attributes: ['id', 'name'], required: false },
        { model: InventoryCountItem, as: 'countItems', include: [{ model: InventoryItem, as: 'item', attributes: ['id', 'name', 'sku', 'category', 'quantity'] }] },
      ],
    });
    if (!count) return res.status(404).json({ error: 'Not found' });
    res.json(count);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const countItem = await InventoryCountItem.findOne({ where: { id: req.params.itemId, countId: req.params.id } });
    if (!countItem) return res.status(404).json({ error: 'Not found' });
    const { countedQty, notes } = req.body;
    const variance = countedQty - countItem.expectedQty;
    await countItem.update({ countedQty, variance, notes });
    res.json(countItem);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const count = await InventoryCount.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [{ model: InventoryCountItem, as: 'countItems' }],
    });
    if (!count) return res.status(404).json({ error: 'Not found' });
    const { applyAdjustments = false } = req.body;
    if (applyAdjustments) {
      for (const ci of count.countItems) {
        if (ci.countedQty !== null && ci.countedQty !== undefined) {
          await InventoryItem.update({ quantity: ci.countedQty }, { where: { id: ci.itemId } });
        }
      }
    }
    await count.update({ status: 'completed', completedAt: new Date() });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
