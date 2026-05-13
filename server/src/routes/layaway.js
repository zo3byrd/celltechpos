const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { LayawayPlan, LayawayPayment, Customer, User } = require('../db/models');

router.use(authenticate);

function layNum() {
  return 'LAY-' + Date.now().toString(36).toUpperCase();
}

router.get('/', async (req, res) => {
  try {
    const { status, customerId, limit = 20, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const rows = await LayawayPlan.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone'], required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ plans: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { totalAmount, depositAmount = 0, items = [], ...rest } = req.body;
    const plan = await LayawayPlan.create({
      ...rest,
      storeId: req.user.storeId,
      userId: req.user.id,
      layawayNumber: layNum(),
      totalAmount,
      depositAmount,
      paidAmount: depositAmount,
      itemsJson: JSON.stringify(items),
    });
    if (depositAmount > 0) {
      await LayawayPayment.create({ layawayId: plan.id, amount: depositAmount, paymentMethod: req.body.paymentMethod || 'cash', notes: 'Initial deposit' });
    }
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await LayawayPlan.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Customer, required: false },
        { model: User, attributes: ['id', 'name'], required: false },
        { model: LayawayPayment, as: 'payments' },
      ],
    });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/payment', async (req, res) => {
  try {
    const plan = await LayawayPlan.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    if (plan.status !== 'active') return res.status(400).json({ error: 'Plan is not active' });
    const { amount, paymentMethod = 'cash', notes } = req.body;
    const pmt = await LayawayPayment.create({ layawayId: plan.id, amount, paymentMethod, notes });
    const newPaid = parseFloat(plan.paidAmount) + parseFloat(amount);
    const status = newPaid >= parseFloat(plan.totalAmount) ? 'completed' : 'active';
    await plan.update({ paidAmount: newPaid, status });
    res.json({ payment: pmt, plan });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const plan = await LayawayPlan.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    await plan.update({ status: req.body.forfeited ? 'forfeited' : 'cancelled' });
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
