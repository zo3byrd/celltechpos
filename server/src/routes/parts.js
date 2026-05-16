const router = require('express').Router();
const { Op } = require('sequelize');
const { PartsCatalogItem, Supplier } = require('../db/models');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { search, brand, supplierId, page = 1, limit = 50 } = req.query;
    const where = { storeId: req.user.storeId, active: true };
    if (brand) where.brand = brand;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { deviceModel: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await PartsCatalogItem.findAndCountAll({
      where,
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false }],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ parts: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const part = await PartsCatalogItem.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(part);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const part = await PartsCatalogItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!part) return res.status(404).json({ error: 'Not found' });
    await part.update(req.body);
    res.json(part);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const part = await PartsCatalogItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!part) return res.status(404).json({ error: 'Not found' });
    await part.update({ active: false });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CSV export
router.get('/export/csv', async (req, res) => {
  try {
    const parts = await PartsCatalogItem.findAll({ where: { storeId: req.user.storeId, active: true }, order: [['name', 'ASC']] });
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name','SKU','Brand','Device Model','Condition','Cost','Price','Qty','Notes'].map(esc).join(',');
    const lines = parts.map(p => [p.name, p.sku, p.brand, p.deviceModel, p.condition, p.cost, p.price, p.quantity, p.description].map(esc).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="parts-catalog.csv"');
    res.send([header, ...lines].join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public storefront: list active items for a store (no auth)
router.get('/public', async (req, res) => {
  try {
    const { storeId, search } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });
    const where = { storeId, active: true };
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { brand: { [Op.like]: `%${search}%` } }];
    const parts = await PartsCatalogItem.findAll({ where, order: [['name', 'ASC']] });
    res.json(parts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
