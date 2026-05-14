const router = require('express').Router();
const { Announcement } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

// GET active announcements (for POS users, called without storeId filter)
router.get('/', auth, async (req, res) => {
  const now = new Date();
  let where = {};
  if (req.user.role !== 'superadmin') {
    where.active = true;
  }
  const rows = await Announcement.findAll({ where, order: [['createdAt', 'DESC']] });
  // Filter expired ones for non-superadmin
  const result = req.user.role === 'superadmin'
    ? rows
    : rows.filter(a => !a.expiresAt || new Date(a.expiresAt) > now);
  res.json(result);
});

router.post('/', auth, requireRole('superadmin'), async (req, res) => {
  const a = await Announcement.create(req.body);
  res.status(201).json(a);
});

router.put('/:id', auth, requireRole('superadmin'), async (req, res) => {
  const a = await Announcement.findByPk(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  await a.update(req.body);
  res.json(a);
});

router.delete('/:id', auth, requireRole('superadmin'), async (req, res) => {
  const a = await Announcement.findByPk(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  await a.destroy();
  res.json({ ok: true });
});

module.exports = router;
