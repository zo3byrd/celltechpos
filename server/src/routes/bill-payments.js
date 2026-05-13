const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { BillPayment, Customer, User } = require('../db/models');

router.use(authenticate);

function billNum() {
  return 'BP-' + Date.now().toString(36).toUpperCase();
}

const CARRIERS = {
  boost:    { name: 'Boost Mobile',  plans: ['$25', '$35', '$50', '$60', '$80', '$100'] },
  tmobile:  { name: 'T-Mobile',      plans: ['$25', '$40', '$50', '$70', '$90'] },
  att:      { name: 'AT&T Prepaid',  plans: ['$25', '$30', '$45', '$65', '$75'] },
  cricket:  { name: 'Cricket',       plans: ['$25', '$30', '$40', '$55', '$60'] },
  metro:    { name: 'Metro by T-Mobile', plans: ['$25', '$40', '$50', '$60'] },
  verizon:  { name: 'Verizon Prepaid', plans: ['$30', '$40', '$50', '$65', '$80'] },
  h2o:      { name: 'H2O Wireless',  plans: ['$10', '$20', '$30', '$40', '$60'] },
  tracfone: { name: 'Tracfone',      plans: ['$10', '$20', '$25', '$35', '$50'] },
  visible:  { name: 'Visible',       plans: ['$25', '$45'] },
};

router.get('/carriers', (req, res) => res.json(CARRIERS));

router.get('/', async (req, res) => {
  try {
    const { type, carrier, status, startDate, endDate, limit = 20, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (type) where.type = type;
    if (carrier) where.carrier = carrier;
    if (status) where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      where.createdAt = { ...where.createdAt, [Op.lt]: end };
    }
    const rows = await BillPayment.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone'], required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ payments: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { amount, fee = 0 } = req.body;
    const total = parseFloat(amount) + parseFloat(fee);
    const bp = await BillPayment.create({
      ...req.body,
      storeId: req.user.storeId,
      userId: req.user.id,
      billNumber: billNum(),
      total,
    });
    res.status(201).json(bp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const bp = await BillPayment.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Customer, required: false },
        { model: User, attributes: ['id', 'name'], required: false },
      ],
    });
    if (!bp) return res.status(404).json({ error: 'Not found' });
    res.json(bp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/refund', async (req, res) => {
  try {
    const bp = await BillPayment.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!bp) return res.status(404).json({ error: 'Not found' });
    await bp.update({ status: 'refunded' });
    res.json(bp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
