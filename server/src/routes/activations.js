const router = require('express').Router();
const { Op } = require('sequelize');
const { Activation, Customer, User } = require('../db/models');
const { auth } = require('../middleware/auth');
const epay = require('../integrations/epay');
const vidapay = require('../integrations/vidapay');

function actNumber() {
  return 'ACT-' + Date.now().toString().slice(-8);
}

router.get('/', auth, async (req, res) => {
  const { carrier, status, search, page = 1, limit = 20 } = req.query;
  const where = { storeId: req.user.storeId };
  if (carrier) where.carrier = carrier;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { activationNumber: { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
      { imei: { [Op.like]: `%${search}%` } },
    ];
  }
  const { rows, count } = await Activation.findAndCountAll({
    where,
    include: [
      { model: Customer },
      { model: User, as: 'salesRep', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  res.json({ activations: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
});

router.get('/:id', auth, async (req, res) => {
  const activation = await Activation.findOne({
    where: { id: req.params.id, storeId: req.user.storeId },
    include: [{ model: Customer }, { model: User, as: 'salesRep', attributes: ['id', 'name'] }],
  });
  if (!activation) return res.status(404).json({ error: 'Activation not found' });
  res.json(activation);
});

router.post('/', auth, async (req, res) => {
  const { carrier, activationType, useEpay, useVidapay, ...rest } = req.body;

  let epayRef = null;
  let vidapayRef = null;

  // Route payment through appropriate integration
  if (useEpay) {
    const result = await epay.processActivation({ carrier, activationType, ...rest });
    epayRef = result.referenceId;
  } else if (useVidapay) {
    const result = await vidapay.processActivation({ carrier, activationType, ...rest });
    vidapayRef = result.referenceId;
  }

  const activation = await Activation.create({
    ...rest,
    carrier,
    activationType,
    storeId: req.user.storeId,
    salesRepId: req.user.id,
    activationNumber: actNumber(),
    status: (useEpay || useVidapay) ? 'submitted' : 'pending',
    epayRef,
    vidapayRef,
  });

  res.status(201).json(activation);
});

router.put('/:id', auth, async (req, res) => {
  const activation = await Activation.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!activation) return res.status(404).json({ error: 'Activation not found' });
  await activation.update(req.body);
  res.json(activation);
});

// Epay balance check
router.get('/integrations/epay-balance', auth, async (req, res) => {
  const balance = await epay.getBalance();
  res.json(balance);
});

// Vidapay plans lookup
router.get('/integrations/vidapay-plans', auth, async (req, res) => {
  const plans = await vidapay.getPlans(req.query.carrier);
  res.json(plans);
});

module.exports = router;
