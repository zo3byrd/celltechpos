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
  const allowed = ['name','address','city','state','zip','phone','email','taxRate'];
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

module.exports = router;
