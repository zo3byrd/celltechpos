const router = require('express').Router();
const { Coupon } = require('../db/models');
const { requireRole } = require('../middleware/auth');
const { getStripe } = require('../stripe');
const { Op } = require('sequelize');

const adminOnly = requireRole('superadmin');

// GET all coupons
router.get('/', adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
    res.json(coupons);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST validate a coupon code (no auth required — used at checkout)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase().trim(),
        active: true,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
      },
    });
    if (!coupon) return res.status(404).json({ error: 'Invalid or expired coupon code' });
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      return res.status(410).json({ error: 'This coupon has reached its usage limit' });
    res.json({ id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create coupon
router.post('/', adminOnly, async (req, res) => {
  try {
    const { code, type, value, maxUses, expiresAt, description } = req.body;
    if (!code || !value) return res.status(400).json({ error: 'code and value are required' });

    const normalizedCode = code.toUpperCase().trim().replace(/\s+/g, '');
    const existing = await Coupon.findOne({ where: { code: normalizedCode } });
    if (existing) return res.status(409).json({ error: 'Coupon code already exists' });

    // Optionally create in Stripe
    const stripe = getStripe();
    let stripeCouponId = null;
    if (stripe) {
      try {
        const params = type === 'percent'
          ? { percent_off: parseFloat(value), duration: 'once', name: normalizedCode }
          : { amount_off: Math.round(parseFloat(value) * 100), currency: 'usd', duration: 'once', name: normalizedCode };
        if (expiresAt) params.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
        const sc = await stripe.coupons.create({ id: normalizedCode, ...params });
        stripeCouponId = sc.id;
      } catch { /* Stripe coupon creation optional — continue */ }
    }

    const coupon = await Coupon.create({
      code: normalizedCode, type, value, maxUses: maxUses || null,
      expiresAt: expiresAt || null, description, stripeCouponId,
    });
    res.status(201).json(coupon);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update coupon
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Not found' });
    const { description, maxUses, expiresAt, active } = req.body;
    await coupon.update({ description, maxUses: maxUses ?? coupon.maxUses, expiresAt: expiresAt ?? coupon.expiresAt, active: active ?? coupon.active });
    res.json(coupon);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE coupon (soft-deactivate)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Not found' });
    await coupon.update({ active: false });
    res.json({ message: 'Coupon deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
