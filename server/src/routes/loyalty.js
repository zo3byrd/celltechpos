const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { LoyaltyAccount, LoyaltyTransaction, Customer, Store } = require('../db/models');

router.use(authenticate);

async function getOrCreate(customerId, storeId) {
  let acc = await LoyaltyAccount.findOne({ where: { customerId } });
  if (!acc) acc = await LoyaltyAccount.create({ customerId, storeId });
  return acc;
}

router.get('/account/:customerId', async (req, res) => {
  try {
    const acc = await getOrCreate(req.params.customerId, req.user.storeId);
    const customer = await Customer.findByPk(req.params.customerId, { attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] });
    const txns = await LoyaltyTransaction.findAll({ where: { accountId: acc.id }, order: [['createdAt', 'DESC']], limit: 20 });
    res.json({ account: acc, customer, transactions: txns });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/earn', async (req, res) => {
  try {
    const { customerId, points, description, referenceId } = req.body;
    const acc = await getOrCreate(customerId, req.user.storeId);
    const newBalance = acc.points + points;
    await acc.update({ points: newBalance, lifetimePoints: acc.lifetimePoints + points });
    const txn = await LoyaltyTransaction.create({ accountId: acc.id, type: 'earn', points, balance: newBalance, referenceId, description });
    res.json({ account: acc, transaction: txn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/redeem', async (req, res) => {
  try {
    const { customerId, points, description, referenceId } = req.body;
    const acc = await getOrCreate(customerId, req.user.storeId);
    if (acc.points < points) return res.status(400).json({ error: 'Insufficient points' });
    const newBalance = acc.points - points;
    await acc.update({ points: newBalance });
    const txn = await LoyaltyTransaction.create({ accountId: acc.id, type: 'redeem', points: -points, balance: newBalance, referenceId, description });
    res.json({ account: acc, transaction: txn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/adjust', requireAdmin, async (req, res) => {
  try {
    const { customerId, points, description } = req.body;
    const acc = await getOrCreate(customerId, req.user.storeId);
    const newBalance = Math.max(0, acc.points + points);
    await acc.update({ points: newBalance });
    const txn = await LoyaltyTransaction.create({ accountId: acc.id, type: 'adjust', points, balance: newBalance, description });
    res.json({ account: acc, transaction: txn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leaderboard', requireAdmin, async (req, res) => {
  try {
    const accounts = await LoyaltyAccount.findAll({
      where: { storeId: req.user.storeId, active: true },
      include: [{ model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone'] }],
      order: [['points', 'DESC']],
      limit: 50,
    });
    res.json(accounts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
