const router = require('express').Router();
const { Op } = require('sequelize');
const { ShiftSchedule, User } = require('../db/models');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { start, end, userId } = req.query;
    const isAdmin = ['superadmin', 'admin'].includes(req.user.role);
    const where = { storeId: req.user.storeId };
    if (!isAdmin) where.userId = req.user.id;
    else if (userId) where.userId = userId;
    if (start) where.startTime = { ...where.startTime, [Op.gte]: new Date(start) };
    if (end)   where.startTime = { ...where.startTime, [Op.lte]: new Date(end + 'T23:59:59') };
    const shifts = await ShiftSchedule.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role'], required: false }],
      order: [['startTime', 'ASC']],
    });
    res.json(shifts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const shift = await ShiftSchedule.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(shift);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const shift = await ShiftSchedule.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!shift) return res.status(404).json({ error: 'Not found' });
    await shift.update(req.body);
    res.json(shift);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const shift = await ShiftSchedule.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!shift) return res.status(404).json({ error: 'Not found' });
    await shift.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
