const router = require('express').Router();
const { Op } = require('sequelize');
const { Commission, User, Activation, Transaction, Store } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');
const { sequelize } = require('../db');

router.get('/', auth, async (req, res) => {
  const { userId, status, periodStart, periodEnd } = req.query;
  const where = { storeId: req.user.storeId };

  if (userId) where.userId = userId;
  else if (!['superadmin', 'admin'].includes(req.user.role)) where.userId = req.user.id;

  if (status) where.status = status;
  if (periodStart) where.periodStart = { [Op.gte]: periodStart };
  if (periodEnd) where.periodEnd = { [Op.lte]: periodEnd };

  const commissions = await Commission.findAll({
    where,
    include: [{ model: User, attributes: ['id', 'name', 'role'] }],
    order: [['periodStart', 'DESC']],
  });
  res.json(commissions);
});

// Calculate commission for a rep for a date range
router.post('/calculate', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { userId, periodStart, periodEnd } = req.body;

  const activations = await Activation.findAll({
    where: {
      salesRepId: userId,
      storeId: req.user.storeId,
      status: 'approved',
      createdAt: { [Op.between]: [new Date(periodStart), new Date(periodEnd)] },
    },
  });

  const activationCommission = activations.reduce((s, a) => s + parseFloat(a.commissionAmount || 0), 0);
  const spiffTotal = activations.reduce((s, a) => s + parseFloat(a.spiffAmount || 0), 0);

  const total = activationCommission + spiffTotal;

  const commission = await Commission.create({
    userId,
    storeId: req.user.storeId,
    periodStart,
    periodEnd,
    activationCommission,
    spiffTotal,
    total,
    status: 'pending',
  });

  res.status(201).json(commission);
});

router.put('/:id/approve', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const commission = await Commission.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!commission) return res.status(404).json({ error: 'Not found' });
  await commission.update({ status: 'approved' });
  res.json(commission);
});

router.put('/:id/pay', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const commission = await Commission.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!commission) return res.status(404).json({ error: 'Not found' });
  await commission.update({ status: 'paid', notes: req.body.notes });
  res.json(commission);
});

module.exports = router;
