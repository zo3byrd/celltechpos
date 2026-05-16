const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { TimeEntry, User } = require('../db/models');

router.use(authenticate);

router.get('/status', async (req, res) => {
  try {
    const active = await TimeEntry.findOne({
      where: { userId: req.user.id, storeId: req.user.storeId, status: 'active' },
      order: [['clockIn', 'DESC']],
    });
    res.json({ clockedIn: !!active, entry: active });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/clock-in', async (req, res) => {
  try {
    const existing = await TimeEntry.findOne({
      where: { userId: req.user.id, storeId: req.user.storeId, status: 'active' },
    });
    if (existing) return res.status(400).json({ error: 'Already clocked in' });
    const entry = await TimeEntry.create({
      userId: req.user.id,
      storeId: req.user.storeId,
      clockIn: new Date(),
      hourlyRate: req.user.hourlyRate || 0,
      notes: req.body.notes,
    });
    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/clock-out', async (req, res) => {
  try {
    const entry = await TimeEntry.findOne({
      where: { userId: req.user.id, storeId: req.user.storeId, status: 'active' },
    });
    if (!entry) return res.status(400).json({ error: 'Not clocked in' });
    const clockOut = new Date();
    const totalMins = Math.round((clockOut - entry.clockIn) / 60000) - (req.body.breakMins || 0);
    const earnings = (totalMins / 60) * parseFloat(entry.hourlyRate || 0);
    await entry.update({ clockOut, totalMins, breakMins: req.body.breakMins || 0, earnings, status: 'completed' });
    res.json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/entries', async (req, res) => {
  try {
    const { userId, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const isAdmin = ['superadmin', 'admin'].includes(req.user.role);
    const where = { storeId: req.user.storeId };
    if (!isAdmin) where.userId = req.user.id;
    else if (userId) where.userId = userId;
    if (startDate) where.clockIn = { ...where.clockIn, [Op.gte]: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      where.clockIn = { ...where.clockIn, [Op.lt]: end };
    }
    const rows = await TimeEntry.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [{ model: User, attributes: ['id', 'name', 'role'], required: false }],
      order: [['clockIn', 'DESC']],
    });
    res.json({ entries: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/entries/:id', requireAdmin, async (req, res) => {
  try {
    const entry = await TimeEntry.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const { clockIn, clockOut, breakMins } = req.body;
    const ci = clockIn ? new Date(clockIn) : entry.clockIn;
    const co = clockOut ? new Date(clockOut) : entry.clockOut;
    const brk = breakMins !== undefined ? parseInt(breakMins) : entry.breakMins;
    const totalMins = co ? Math.round((co - ci) / 60000) - brk : null;
    const earnings = totalMins ? (totalMins / 60) * parseFloat(entry.hourlyRate || 0) : 0;
    await entry.update({ ...req.body, clockIn: ci, clockOut: co, breakMins: brk, totalMins, earnings, status: 'adjusted' });
    res.json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/payroll/export', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { storeId: req.user.storeId, status: { [Op.ne]: 'active' } };
    if (startDate) where.clockIn = { ...where.clockIn, [Op.gte]: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      where.clockIn = { ...where.clockIn, [Op.lt]: end };
    }
    const entries = await TimeEntry.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role', 'hourlyRate'], required: false }],
      order: [['clockIn', 'ASC']],
    });
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Employee', 'Role', 'Clock In', 'Clock Out', 'Break (min)', 'Total Hours', 'Rate/hr', 'Earnings'].map(esc).join(',')];
    for (const e of entries) {
      lines.push([
        e.User?.name || 'Unknown',
        e.User?.role || '',
        e.clockIn ? new Date(e.clockIn).toLocaleString() : '',
        e.clockOut ? new Date(e.clockOut).toLocaleString() : '',
        e.breakMins || 0,
        ((e.totalMins || 0) / 60).toFixed(2),
        parseFloat(e.User?.hourlyRate || 0).toFixed(2),
        parseFloat(e.earnings || 0).toFixed(2),
      ].map(esc).join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(lines.join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/payroll', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const where = { storeId: req.user.storeId, status: { [Op.ne]: 'active' } };
    if (userId) where.userId = userId;
    if (startDate) where.clockIn = { ...where.clockIn, [Op.gte]: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      where.clockIn = { ...where.clockIn, [Op.lt]: end };
    }
    const entries = await TimeEntry.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role', 'hourlyRate'], required: false }],
    });
    const byUser = {};
    for (const e of entries) {
      const uid = e.userId;
      if (!byUser[uid]) byUser[uid] = { user: e.User, totalMins: 0, totalHours: 0, totalEarnings: 0, entries: 0 };
      byUser[uid].totalMins += (e.totalMins || 0);
      byUser[uid].totalHours = byUser[uid].totalMins / 60;
      byUser[uid].totalEarnings += parseFloat(e.earnings || 0);
      byUser[uid].entries++;
    }
    res.json(Object.values(byUser));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
