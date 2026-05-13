const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Supplier, InventoryItem } = require('../db/models');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { search, active } = req.query;
    const where = { storeId: req.user.storeId };
    if (active !== undefined) where.active = active === 'true';
    if (search) where.name = { [Op.like]: `%${search}%` };
    const suppliers = await Supplier.findAll({ where, order: [['name', 'ASC']] });
    res.json(suppliers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const s = await Supplier.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const s = await Supplier.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!s) return res.status(404).json({ error: 'Not found' });
    await s.update(req.body);
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const s = await Supplier.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!s) return res.status(404).json({ error: 'Not found' });
    await s.update({ active: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
