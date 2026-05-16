const router = require('express').Router();
const { Op } = require('sequelize');
const { Customer, RepairTicket, Transaction, Activation } = require('../db/models');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = { storeId: req.user.storeId };
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await Customer.findAndCountAll({
      where,
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ customers: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    await customer.update(req.body);
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const rows = await Customer.findAll({
      where: { storeId: req.user.storeId },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['First Name','Last Name','Email','Phone','Address','City','State','Zip','Notes','Created'].join(',');
    const lines = rows.map(c => [
      c.firstName, c.lastName, c.email, c.phone,
      c.address, c.city, c.state, c.zip, c.notes,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    ].map(escape).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send([header, ...lines].join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
