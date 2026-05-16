const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { Buyback, Customer, User, InventoryItem } = require('../db/models');

router.use(auth);

function ticketNum() {
  return 'BB-' + Date.now().toString().slice(-6);
}

// GET stats — must be before /:id
router.get('/stats/summary', async (req, res) => {
  try {
    const { sequelize } = require('../db');
    const [rows] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='completed' THEN finalPrice ELSE 0 END) as totalPaid,
        SUM(CASE WHEN createdAt >= datetime('now','-30 days') AND status='completed' THEN 1 ELSE 0 END) as last30
      FROM Buybacks WHERE storeId = :storeId
    `, { replacements: { storeId: req.user.storeId } });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all buybacks
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    const rows = await Buyback.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: User, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ buybacks: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single buyback
router.get('/:id', async (req, res) => {
  try {
    const b = await Buyback.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, attributes: ['id', 'name'] },
      ],
    });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create buyback
router.post('/', async (req, res) => {
  try {
    const {
      customerId, deviceBrand, deviceModel, deviceColor,
      imei, storage, condition, quotedPrice, finalPrice,
      paymentMethod, status, addToInventory, notes,
    } = req.body;

    const b = await Buyback.create({
      id: uuidv4(),
      storeId: req.user.storeId,
      userId: req.user.id,
      customerId: customerId || null,
      ticketNumber: ticketNum(),
      deviceBrand, deviceModel, deviceColor,
      imei, storage, condition,
      quotedPrice: parseFloat(quotedPrice) || 0,
      finalPrice: parseFloat(finalPrice) || 0,
      paymentMethod: paymentMethod || 'cash',
      status: status || 'completed',
      addToInventory: !!addToInventory,
      notes,
    });

    // Optionally add device to inventory
    if (addToInventory && status === 'completed') {
      const inv = await InventoryItem.create({
        id: uuidv4(),
        storeId: req.user.storeId,
        name: `${deviceBrand || ''} ${deviceModel || ''}`.trim() || 'Used Device',
        category: 'Used Phones',
        brand: deviceBrand || '',
        sku: `BB-${b.ticketNumber}`,
        costPrice: parseFloat(finalPrice) || 0,
        sellPrice: parseFloat(finalPrice) * 1.3 || 0,
        quantity: 1,
        condition: condition || 'good',
        notes: `Bought back from customer. IMEI: ${imei || 'N/A'}. ${notes || ''}`.trim(),
        active: true,
      });
      await b.update({ inventoryItemId: inv.id });
    }

    res.status(201).json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const b = await Buyback.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!b) return res.status(404).json({ error: 'Not found' });
    await b.update(req.body);
    res.json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
