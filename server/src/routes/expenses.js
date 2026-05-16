const router = require('express').Router();
const { Op } = require('sequelize');
const { Expense, User } = require('../db/models');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { category, from, to, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to)   where.date[Op.lte] = to;
    }
    const { rows, count } = await Expense.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'name'], required: false }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    const total = rows.reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ expenses: rows, count, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { category, amount, description, vendor, date, notes } = req.body;
    if (!amount || !description || !date) return res.status(400).json({ error: 'amount, description, date required' });
    const expense = await Expense.create({
      storeId: req.user.storeId,
      userId: req.user.id,
      category: category || 'other',
      amount: parseFloat(amount),
      description,
      vendor: vendor || null,
      date,
      notes: notes || null,
    });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!expense) return res.status(404).json({ error: 'Not found' });
    await expense.update(req.body);
    res.json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!expense) return res.status(404).json({ error: 'Not found' });
    await expense.destroy();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
