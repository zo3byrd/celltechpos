const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Store, User } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const where = {};
  if (req.user.role === 'admin') where.storeId = req.user.storeId;
  const users = await User.findAll({
    where,
    attributes: { exclude: ['passwordHash', 'pin'] },
    include: [{ model: Store, attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });
  res.json(users);
});

router.post('/users', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { name, email, password, role, storeId } = req.body;
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already in use' });
  const user = await User.create({
    name, email, role,
    storeId: storeId || req.user.storeId,
    passwordHash: await bcrypt.hash(password, 10),
  });
  const { passwordHash, ...safe } = user.toJSON();
  res.status(201).json(safe);
});

router.put('/users/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.user.role === 'admin' && user.storeId !== req.user.storeId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { password, ...fields } = req.body;
  if (password) fields.passwordHash = await bcrypt.hash(password, 10);
  await user.update(fields);
  const { passwordHash, ...safe } = user.toJSON();
  res.json(safe);
});

router.delete('/users/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });
  await user.update({ active: false });
  res.json({ message: 'User deactivated' });
});

// ── My Store (for admin self-service) ─────────────────────────────────────────
router.get('/store', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const store = await Store.findByPk(req.user.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json(store);
});

router.put('/store', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const store = await Store.findByPk(req.user.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const allowed = ['name','address','city','state','zip','phone','email','taxRate','logoUrl','receiptPolicy','googleReviewUrl','taxConfigJson'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  await store.update(updates);
  res.json(store);
});

// ── System stats ──────────────────────────────────────────────────────────────
router.get('/system', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { InventoryItem, RepairTicket, Customer, Transaction, Activation, User } = require('../db/models');
  const { Op } = require('sequelize');
  const sid = req.user.storeId;
  const [inventory, repairs, customers, transactions, activations, staff] = await Promise.all([
    InventoryItem.count({ where: { storeId: sid, active: true } }),
    RepairTicket.count({ where: { storeId: sid } }),
    Customer.count({ where: { storeId: sid } }),
    Transaction.count({ where: { storeId: sid } }),
    Activation.count({ where: { storeId: sid } }),
    User.count({ where: { storeId: sid, active: true } }),
  ]);
  res.json({ inventory, repairs, customers, transactions, activations, staff, version: '1.0.0', db: 'SQLite', uptime: process.uptime() });
});

// ── Stores ────────────────────────────────────────────────────────────────────
router.get('/stores', auth, requireRole('superadmin'), async (req, res) => {
  const stores = await Store.findAll({ include: [{ model: User, attributes: ['id', 'name', 'role', 'active'] }] });
  res.json(stores);
});

router.post('/stores', auth, requireRole('superadmin'), async (req, res) => {
  const store = await Store.create(req.body);
  res.status(201).json(store);
});

router.put('/stores/:id', auth, requireRole('superadmin'), async (req, res) => {
  const store = await Store.findByPk(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  await store.update(req.body);
  res.json(store);
});

// ── Seed default inventory for a store ────────────────────────────────────────
router.post('/stores/:id/seed-inventory', auth, requireRole('superadmin'), async (req, res) => {
  const { InventoryItem } = require('../db/models');
  const { getDefaultItems } = require('../db/defaultInventory');

  const store = await Store.findByPk(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const items = getDefaultItems();
  let created = 0, skipped = 0;

  for (const item of items) {
    const exists = await InventoryItem.findOne({ where: { sku: item.sku, storeId: req.params.id } });
    if (exists) { skipped++; continue; }
    await InventoryItem.create({ ...item, storeId: req.params.id });
    created++;
  }

  res.json({ created, skipped, total: created + skipped });
});

// ── Store notes ───────────────────────────────────────────────────────────────
router.get('/stores/:id/notes', auth, requireRole('superadmin'), async (req, res) => {
  const [rows] = await require('../db').sequelize.query(
    'SELECT * FROM StoreNotes WHERE storeId = ? ORDER BY createdAt DESC',
    { replacements: [req.params.id] }
  );
  res.json(rows);
});

router.post('/stores/:id/notes', auth, requireRole('superadmin'), async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'note required' });
  await require('../db').sequelize.query(
    'INSERT INTO StoreNotes (id, storeId, note, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    { replacements: [require('uuid').v4(), req.params.id, note, req.user.id, new Date().toISOString(), new Date().toISOString()] }
  );
  res.status(201).json({ ok: true });
});

router.delete('/stores/:id/notes/:noteId', auth, requireRole('superadmin'), async (req, res) => {
  await require('../db').sequelize.query(
    'DELETE FROM StoreNotes WHERE id = ? AND storeId = ?',
    { replacements: [req.params.noteId, req.params.id] }
  );
  res.json({ ok: true });
});

// ── Superadmin Analytics ──────────────────────────────────────────────────────
router.get('/analytics', auth, requireRole('superadmin'), async (req, res) => {
  try {
    const { sequelize } = require('../db');

    const [storeActivity] = await sequelize.query(`
      SELECT
        s.id, s.name, s.city, s.state, s.email,
        (SELECT MAX(createdAt) FROM Transactions WHERE storeId = s.id) as lastTxn,
        (SELECT COUNT(*) FROM Transactions WHERE storeId = s.id AND createdAt >= datetime('now','-30 days')) as txn30d,
        (SELECT COUNT(*) FROM RepairTickets WHERE storeId = s.id AND createdAt >= datetime('now','-30 days')) as repair30d,
        (SELECT COUNT(*) FROM Activations WHERE storeId = s.id AND createdAt >= datetime('now','-30 days')) as act30d,
        (SELECT COUNT(*) FROM InventoryItems WHERE storeId = s.id AND active = 1) as inventoryCount,
        (SELECT COUNT(*) FROM Customers WHERE storeId = s.id) as customerCount
      FROM Stores s
      ORDER BY lastTxn DESC
    `);

    const [topItems] = await sequelize.query(`
      SELECT name, category, COUNT(DISTINCT storeId) as storeCount, COUNT(*) as total
      FROM InventoryItems
      WHERE active = 1
      GROUP BY LOWER(name), category
      ORDER BY storeCount DESC, total DESC
      LIMIT 20
    `);

    const [topCategories] = await sequelize.query(`
      SELECT category, COUNT(*) as total, COUNT(DISTINCT storeId) as storeCount
      FROM InventoryItems
      WHERE active = 1
      GROUP BY category
      ORDER BY total DESC
    `);

    const [topBrands] = await sequelize.query(`
      SELECT brand, COUNT(*) as total, COUNT(DISTINCT storeId) as storeCount
      FROM InventoryItems
      WHERE active = 1 AND brand IS NOT NULL AND brand != ''
      GROUP BY LOWER(brand)
      ORDER BY total DESC
      LIMIT 12
    `);

    const [recentItems] = await sequelize.query(`
      SELECT i.name, i.category, i.brand, i.price, i.createdAt,
             s.name as storeName
      FROM InventoryItems i
      LEFT JOIN Stores s ON s.id = i.storeId
      WHERE i.active = 1
      ORDER BY i.createdAt DESC
      LIMIT 25
    `);

    res.json({ storeActivity, topItems, topCategories, topBrands, recentItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
