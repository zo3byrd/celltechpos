const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { SalesGoal, Transaction, RepairTicket, Activation, User } = require('../db/models');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { period, userId } = req.query;
    const where = { storeId: req.user.storeId };
    if (period) where.period = period;
    if (userId) where.userId = userId;
    const goals = await SalesGoal.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role'], required: false }],
      order: [['createdAt', 'DESC']],
    });
    res.json(goals);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const goal = await SalesGoal.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(goal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const goal = await SalesGoal.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!goal) return res.status(404).json({ error: 'Not found' });
    await goal.update(req.body);
    res.json(goal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const goal = await SalesGoal.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!goal) return res.status(404).json({ error: 'Not found' });
    await goal.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Progress: returns current value vs target for each goal
router.get('/progress', async (req, res) => {
  try {
    const goals = await SalesGoal.findAll({ where: { storeId: req.user.storeId } });
    const now = new Date();

    const results = await Promise.all(goals.map(async goal => {
      const start = goal.startDate ? new Date(goal.startDate) : (() => {
        const d = new Date(now);
        if (goal.period === 'daily') d.setHours(0, 0, 0, 0);
        else if (goal.period === 'weekly') { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); }
        else { d.setDate(1); d.setHours(0,0,0,0); }
        return d;
      })();
      const end = goal.endDate ? new Date(goal.endDate + 'T23:59:59') : now;
      const dateWhere = { [Op.gte]: start, [Op.lte]: end };
      const txWhere = { storeId: req.user.storeId, paymentStatus: 'completed', createdAt: dateWhere };
      if (goal.userId) txWhere.userId = goal.userId;

      let current = 0;
      if (goal.type === 'revenue') {
        current = parseFloat(await Transaction.sum('total', { where: { ...txWhere, type: { [Op.in]: ['sale', 'repair_payment'] } } }) || 0);
      } else if (goal.type === 'transactions') {
        current = await Transaction.count({ where: txWhere });
      } else if (goal.type === 'repairs') {
        const rWhere = { storeId: req.user.storeId, createdAt: dateWhere, status: { [Op.notIn]: ['cancelled'] } };
        if (goal.userId) rWhere.technicianId = goal.userId;
        current = await RepairTicket.count({ where: rWhere });
      } else if (goal.type === 'activations') {
        const aWhere = { storeId: req.user.storeId, createdAt: dateWhere, status: 'approved' };
        if (goal.userId) aWhere.salesRepId = goal.userId;
        current = await Activation.count({ where: aWhere });
      }

      const target = parseFloat(goal.target);
      return {
        ...goal.toJSON(),
        current,
        progress: target > 0 ? Math.min((current / target) * 100, 100) : 0,
      };
    }));

    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
