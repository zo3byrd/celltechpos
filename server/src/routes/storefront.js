const router = require('express').Router();
const { Op } = require('sequelize');
const { InventoryItem, Store } = require('../db/models');

// Public — no auth required
router.get('/', async (req, res) => {
  try {
    const { storeId, search, category, page = 1, limit = 48 } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });
    const store = await Store.findByPk(storeId, { attributes: ['id', 'name', 'phone', 'email', 'address', 'city', 'state', 'logoUrl'] });
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const where = { storeId, active: true, quantity: { [Op.gt]: 0 } };
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await InventoryItem.findAndCountAll({
      where,
      attributes: ['id', 'name', 'brand', 'category', 'price', 'description', 'imageUrl', 'quantity'],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ store: store.toJSON(), items: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
