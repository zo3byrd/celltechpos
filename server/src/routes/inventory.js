const router = require('express').Router();
const { Op } = require('sequelize');
const { InventoryItem } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { category, search, lowStock, page = 1, limit = 50 } = req.query;
    const where = { storeId: req.user.storeId, active: true };
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
      ];
    }

    if (lowStock === 'true') {
      const items = await InventoryItem.findAll({
        where: { ...where, active: true },
        order: [['quantity', 'ASC']],
      });
      const low = items.filter(i => i.quantity <= i.minQuantity);
      return res.json({ items: low, total: low.length });
    }

    const { rows, count } = await InventoryItem.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ items: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/adjust', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { quantity, reason } = req.body;
    await item.increment('quantity', { by: parseInt(quantity) });
    await item.reload();
    res.json({ item, adjustment: quantity, reason });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update({ active: false });
    res.json({ message: 'Item deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
