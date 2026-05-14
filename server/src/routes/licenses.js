const router = require('express').Router();
const { sequelize } = require('../db');
const { License, Store, User } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const superadminOnly = requireRole('superadmin');

router.use(auth);

// Raw query helper for reads (bypasses Sequelize date-parsing bug on SQLite)
async function rawLicense(storeId) {
  const [rows] = await sequelize.query(
    'SELECT l.*, s.name as storeName, s.email as storeEmail, s.phone as storePhone, s.city as storeCity, s.state as storeState FROM `Licenses` l LEFT JOIN `Stores` s ON l.storeId = s.id WHERE l.storeId = ? LIMIT 1',
    { replacements: [storeId] }
  );
  return rows[0] || null;
}

async function rawAllLicenses() {
  const [rows] = await sequelize.query(
    'SELECT l.*, s.name as storeName, s.email as storeEmail, s.phone as storePhone, s.city as storeCity, s.state as storeState FROM `Licenses` l LEFT JOIN `Stores` s ON l.storeId = s.id ORDER BY l.createdAt DESC'
  );
  return rows;
}

function daysUntil(isoStr) {
  if (!isoStr) return null;
  return Math.ceil((new Date(isoStr) - new Date()) / 86400000);
}

// GET my store's license
router.get('/my', async (req, res) => {
  try {
    const lic = await rawLicense(req.user.storeId);
    if (lic) lic.daysLeft = daysUntil(lic.expiresAt);
    res.json(lic || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all licenses (superadmin only)
router.get('/', superadminOnly, async (req, res) => {
  try {
    const rows = await rawAllLicenses();
    // Auto-expire any that have passed
    const now = new Date();
    for (const lic of rows) {
      if (lic.status === 'active' && lic.expiresAt && now > new Date(lic.expiresAt)) {
        lic.status = 'expired';
        await sequelize.query(
          "UPDATE `Licenses` SET status='expired', updatedAt=? WHERE storeId=?",
          { replacements: [now.toISOString(), lic.storeId] }
        );
      }
      lic.daysLeft = daysUntil(lic.expiresAt);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create license (superadmin only)
router.post('/', superadminOnly, async (req, res) => {
  try {
    const { storeId, plan, price, expiresAt, notes, autoRenew } = req.body;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });
    const existing = await rawLicense(storeId);
    if (existing) return res.status(409).json({ error: 'License already exists. Use PUT to update.' });
    await License.create({
      storeId, plan: plan || 'monthly', status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt || null, price: price || 0,
      lastPaidAt: new Date().toISOString(), notes, autoRenew: !!autoRenew,
    });
    res.status(201).json(await rawLicense(storeId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update license (superadmin only)
router.put('/:storeId', superadminOnly, async (req, res) => {
  try {
    const lic = await License.findOne({ where: { storeId: req.params.storeId } });
    if (!lic) return res.status(404).json({ error: 'License not found' });
    const { plan, status, price, expiresAt, startedAt, notes, autoRenew } = req.body;
    await lic.update({ plan, status, price, expiresAt, startedAt, notes, autoRenew });
    res.json(await rawLicense(req.params.storeId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST extend (superadmin only)
router.post('/:storeId/extend', superadminOnly, async (req, res) => {
  try {
    const { months, years, price } = req.body;
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });

    const base = existing.expiresAt && new Date(existing.expiresAt) > new Date()
      ? new Date(existing.expiresAt)
      : new Date();
    if (months) base.setMonth(base.getMonth() + parseInt(months));
    if (years)  base.setFullYear(base.getFullYear() + parseInt(years));

    const newExpiry = base.toISOString();
    const plan = years ? 'yearly' : 'monthly';
    const now = new Date().toISOString();
    const sets = price !== undefined
      ? "expiresAt=?, status='active', plan=?, lastPaidAt=?, price=?, updatedAt=?"
      : "expiresAt=?, status='active', plan=?, lastPaidAt=?, updatedAt=?";
    const vals = price !== undefined
      ? [newExpiry, plan, now, price, now, req.params.storeId]
      : [newExpiry, plan, now, now, req.params.storeId];
    await sequelize.query(
      `UPDATE \`Licenses\` SET ${sets} WHERE storeId=?`,
      { replacements: vals }
    );
    const result = await rawLicense(req.params.storeId);
    result.daysLeft = daysUntil(result.expiresAt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST toggle suspend (superadmin only)
router.post('/:storeId/suspend', superadminOnly, async (req, res) => {
  try {
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });
    const newStatus = existing.status === 'suspended' ? 'active' : 'suspended';
    await sequelize.query(
      "UPDATE `Licenses` SET status=?, updatedAt=? WHERE storeId=?",
      { replacements: [newStatus, new Date().toISOString(), req.params.storeId] }
    );
    res.json(await rawLicense(req.params.storeId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE cancel (superadmin only)
router.delete('/:storeId', superadminOnly, async (req, res) => {
  try {
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });
    await sequelize.query(
      "UPDATE `Licenses` SET status='cancelled', updatedAt=? WHERE storeId=?",
      { replacements: [new Date().toISOString(), req.params.storeId] }
    );
    res.json({ message: 'License cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST onboard new store (superadmin only) — creates store + admin user + license in one shot
router.post('/onboard', superadminOnly, async (req, res) => {
  const { storeName, storeEmail, storePhone, storeAddress, storeCity, storeState, storeZip,
          adminName, adminEmail, adminPassword, plan, price, months, notes } = req.body;
  if (!storeName || !adminEmail || !adminPassword)
    return res.status(400).json({ error: 'storeName, adminEmail, adminPassword required' });

  const t = await sequelize.transaction();
  try {
    const store = await Store.create({
      name: storeName, email: storeEmail, phone: storePhone,
      address: storeAddress, city: storeCity, state: storeState, zip: storeZip,
      taxRate: 0.0825,
    }, { transaction: t });

    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      storeId: store.id, name: adminName || 'Store Admin',
      email: adminEmail, passwordHash: hash, role: 'admin',
    }, { transaction: t });

    const mo = parseInt(months) || 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + mo);
    await License.create({
      storeId: store.id, plan: plan || 'monthly', status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: expiry.toISOString(),
      price: price || 0, autoRenew: false, notes,
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ storeId: store.id, message: 'Store onboarded successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

// GET store details (superadmin only)
router.get('/:storeId/details', superadminOnly, async (req, res) => {
  try {
    const lic = await rawLicense(req.params.storeId);
    if (!lic) return res.status(404).json({ error: 'Not found' });
    const [users] = await sequelize.query(
      'SELECT id, name, email, role, active, createdAt FROM `Users` WHERE storeId = ? ORDER BY role, name',
      { replacements: [req.params.storeId] }
    );
    const [counts] = await sequelize.query(
      `SELECT
        (SELECT COUNT(*) FROM RepairTickets WHERE storeId=?) as repairs,
        (SELECT COUNT(*) FROM Customers WHERE storeId=?) as customers,
        (SELECT COUNT(*) FROM Transactions WHERE storeId=?) as transactions`,
      { replacements: [req.params.storeId, req.params.storeId, req.params.storeId] }
    );
    lic.daysLeft = daysUntil(lic.expiresAt);
    res.json({ license: lic, users, stats: counts[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET revenue stats (superadmin only)
router.get('/stats/revenue', superadminOnly, async (req, res) => {
  try {
    const all = await rawAllLicenses();
    const active  = all.filter(l => l.status === 'active');
    const monthly = active.filter(l => l.plan === 'monthly');
    const yearly  = active.filter(l => l.plan === 'yearly');
    const mrr = monthly.reduce((s, l) => s + parseFloat(l.price || 0), 0)
              + yearly.reduce((s, l) => s + parseFloat(l.price || 0) / 12, 0);
    res.json({
      totalStores:   all.length,
      activeStores:  active.length,
      monthly:       monthly.length,
      yearly:        yearly.length,
      trial:         active.filter(l => l.plan === 'trial').length,
      expired:       all.filter(l => l.status === 'expired').length,
      suspended:     all.filter(l => l.status === 'suspended').length,
      mrr:           parseFloat(mrr.toFixed(2)),
      arr:           parseFloat((mrr * 12).toFixed(2)),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
