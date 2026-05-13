const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { SerialNumber, InventoryItem, Customer } = require('../db/models');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { itemId, status, search, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (itemId) where.itemId = itemId;
    if (status) where.status = status;
    if (search) where[Op.or] = [
      { serial: { [Op.like]: `%${search}%` } },
      { imei: { [Op.like]: `%${search}%` } },
    ];
    const rows = await SerialNumber.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [{ model: InventoryItem, as: 'item', attributes: ['id', 'name', 'sku'], required: false }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ serials: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const sn = await SerialNumber.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(sn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { itemId, serials } = req.body;
    const created = [];
    for (const s of serials) {
      created.push(await SerialNumber.create({ storeId: req.user.storeId, itemId, serial: s.serial, imei: s.imei, notes: s.notes }));
    }
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const sn = await SerialNumber.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!sn) return res.status(404).json({ error: 'Not found' });
    await sn.update(req.body);
    res.json(sn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
