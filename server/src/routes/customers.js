const router = require('express').Router();
const { Op } = require('sequelize');
const { Customer, RepairTicket, Transaction, Activation } = require('../db/models');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const where = { storeId: req.user.storeId };
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
    ];
  }
  const { rows, count } = await Customer.findAndCountAll({
    where,
    order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  res.json({ customers: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
});

router.get('/:id', auth, async (req, res) => {
  const customer = await Customer.findOne({
    where: { id: req.params.id, storeId: req.user.storeId },
    include: [
      { model: RepairTicket, order: [['createdAt', 'DESC']], limit: 10 },
      { model: Transaction, order: [['createdAt', 'DESC']], limit: 10 },
      { model: Activation, order: [['createdAt', 'DESC']], limit: 10 },
    ],
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

router.post('/', auth, async (req, res) => {
  const customer = await Customer.create({ ...req.body, storeId: req.user.storeId });
  res.status(201).json(customer);
});

router.put('/:id', auth, async (req, res) => {
  const customer = await Customer.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  await customer.update(req.body);
  res.json(customer);
});

module.exports = router;
