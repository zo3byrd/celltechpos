const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Subscription, SubscriptionPlan, Customer, User } = require('../db/models');

router.use(authenticate);

router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { storeId: req.user.storeId, active: true },
      order: [['price', 'ASC']],
    });
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/plans', requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/plans/:id', requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    await plan.update(req.body);
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/plans/:id', requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    await plan.update({ active: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { status, customerId, planId, limit = 20, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (planId) where.planId = planId;
    const rows = await Subscription.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'], required: false },
        { model: SubscriptionPlan, attributes: ['id', 'name', 'price', 'interval'], required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ subscriptions: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { planId, customerId, startDate, paymentMethod, notes } = req.body;
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const start = startDate ? new Date(startDate) : new Date();
    const nextBilling = new Date(start);
    if (plan.interval === 'weekly') nextBilling.setDate(nextBilling.getDate() + 7);
    else if (plan.interval === 'monthly') nextBilling.setMonth(nextBilling.getMonth() + 1);
    else if (plan.interval === 'yearly') nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    const sub = await Subscription.create({
      storeId: req.user.storeId,
      userId: req.user.id,
      customerId,
      planId,
      startDate: start,
      nextBillingDate: nextBilling,
      paymentMethod,
      notes,
      price: plan.price,
    });
    res.status(201).json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Customer, required: false },
        { model: SubscriptionPlan, required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/renew', async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [{ model: SubscriptionPlan, required: false }],
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    const nextBilling = new Date(sub.nextBillingDate);
    if (sub.SubscriptionPlan?.interval === 'weekly') nextBilling.setDate(nextBilling.getDate() + 7);
    else if (sub.SubscriptionPlan?.interval === 'monthly') nextBilling.setMonth(nextBilling.getMonth() + 1);
    else if (sub.SubscriptionPlan?.interval === 'yearly') nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    await sub.update({ nextBillingDate: nextBilling, lastBilledDate: new Date(), status: 'active', renewalCount: (sub.renewalCount || 0) + 1 });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    await sub.update({ status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
