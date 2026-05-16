const router = require('express').Router();
const { Op } = require('sequelize');
const { GiftCard, Customer, User } = require('../db/models');
const { auth } = require('../middleware/auth');

router.use(auth);

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GC${seg()}-${seg()}-${seg()}`;
}

// List gift cards
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 30, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    const cards = await GiftCard.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone'], required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ cards: cards.rows, total: cards.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Check balance by code
router.get('/check/:code', async (req, res) => {
  try {
    const card = await GiftCard.findOne({
      where: { code: req.params.code.toUpperCase(), storeId: req.user.storeId },
      include: [{ model: Customer, attributes: ['id', 'firstName', 'lastName'], required: false }],
    });
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    res.json(card);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sell (create) a gift card
router.post('/', async (req, res) => {
  try {
    const { amount, customerId, note } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount required' });

    let code;
    let attempts = 0;
    do {
      code = generateCode();
      const exists = await GiftCard.findOne({ where: { code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    const card = await GiftCard.create({
      storeId: req.user.storeId,
      userId: req.user.id,
      code,
      initialBalance: parseFloat(amount),
      balance: parseFloat(amount),
      customerId: customerId || null,
      note: note || null,
      status: 'active',
    });
    res.status(201).json(card);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Void a card
router.put('/:id/void', async (req, res) => {
  try {
    const card = await GiftCard.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!card) return res.status(404).json({ error: 'Not found' });
    await card.update({ status: 'void' });
    res.json(card);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
