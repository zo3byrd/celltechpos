const router = require('express').Router();
const { sequelize } = require('../db');
const { License, Store, User, StripePlan } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getStripe } = require('../stripe');
const { isConfigured: paypalConfigured, createSubscription: createPayPalSubscription } = require('../paypal');

const superadminOnly = requireRole('superadmin');

router.use(auth);

// Raw query helper for reads (bypasses Sequelize date-parsing bug on SQLite)
async function rawLicense(storeId) {
  const [rows] = await sequelize.query(
    'SELECT l.*, s.name as storeName, s.email as storeEmail, s.phone as storePhone, s.city as storeCity, s.state as storeState FROM `Licenses` l LEFT JOIN `Stores` s ON l.storeId = s.id WHERE l.storeId = ? LIMIT 1',
    { replacements: [storeId] }
  );
  return rows[0] || null;
}

async function rawAllLicenses() {
  const [rows] = await sequelize.query(
    'SELECT l.*, s.name as storeName, s.email as storeEmail, s.phone as storePhone, s.city as storeCity, s.state as storeState FROM `Licenses` l LEFT JOIN `Stores` s ON l.storeId = s.id ORDER BY l.createdAt DESC'
  );
  return rows;
}

function daysUntil(isoStr) {
  if (!isoStr) return null;
  return Math.ceil((new Date(isoStr) - new Date()) / 86400000);
}

function getPlanTier(license) {
  if (!license || license.plan === 'trial') return 'trial';
  const key = (license.stripePlanKey || '').toLowerCase();
  if (key.includes('multi')) return 'multi';
  if (key.includes('pro')) return 'pro';
  return 'starter';
}

// GET my store's license
router.get('/my', async (req, res) => {
  try {
    const lic = await rawLicense(req.user.storeId);
    if (lic) lic.daysLeft = daysUntil(lic.expiresAt);
    res.json(lic || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all licenses (superadmin only)
router.get('/', superadminOnly, async (req, res) => {
  try {
    const rows = await rawAllLicenses();
    // Auto-expire any that have passed
    const now = new Date();
    for (const lic of rows) {
      if (lic.status === 'active' && lic.expiresAt && now > new Date(lic.expiresAt)) {
        lic.status = 'expired';
        await sequelize.query(
          "UPDATE `Licenses` SET status='expired', updatedAt=? WHERE storeId=?",
          { replacements: [now.toISOString(), lic.storeId] }
        );
      }
      lic.daysLeft = daysUntil(lic.expiresAt);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create license (superadmin only)
router.post('/', superadminOnly, async (req, res) => {
  try {
    const { storeId, plan, price, expiresAt, notes, autoRenew } = req.body;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });
    const existing = await rawLicense(storeId);
    if (existing) return res.status(409).json({ error: 'License already exists. Use PUT to update.' });
    await License.create({
      storeId, plan: plan || 'monthly', status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt || null, price: price || 0,
      lastPaidAt: new Date().toISOString(), notes, autoRenew: !!autoRenew,
    });
    res.status(201).json(await rawLicense(storeId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update license (superadmin only)
router.put('/:storeId', superadminOnly, async (req, res) => {
  try {
    const lic = await License.findOne({ where: { storeId: req.params.storeId } });
    if (!lic) return res.status(404).json({ error: 'License not found' });
    const { plan, status, price, expiresAt, startedAt, notes, autoRenew } = req.body;
    await lic.update({ plan, status, price, expiresAt, startedAt, notes, autoRenew });
    res.json(await rawLicense(req.params.storeId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST extend (superadmin only)
router.post('/:storeId/extend', superadminOnly, async (req, res) => {
  try {
    const { months, years, price } = req.body;
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });

    const base = existing.expiresAt && new Date(existing.expiresAt) > new Date()
      ? new Date(existing.expiresAt)
      : new Date();
    if (months) base.setMonth(base.getMonth() + parseInt(months));
    if (years)  base.setFullYear(base.getFullYear() + parseInt(years));

    const newExpiry = base.toISOString();
    const plan = years ? 'yearly' : 'monthly';
    const now = new Date().toISOString();
    const sets = price !== undefined
      ? "expiresAt=?, status='active', plan=?, lastPaidAt=?, price=?, updatedAt=?"
      : "expiresAt=?, status='active', plan=?, lastPaidAt=?, updatedAt=?";
    const vals = price !== undefined
      ? [newExpiry, plan, now, price, now, req.params.storeId]
      : [newExpiry, plan, now, now, req.params.storeId];
    await sequelize.query(
      `UPDATE \`Licenses\` SET ${sets} WHERE storeId=?`,
      { replacements: vals }
    );
    const result = await rawLicense(req.params.storeId);
    result.daysLeft = daysUntil(result.expiresAt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST toggle suspend (superadmin only)
router.post('/:storeId/suspend', superadminOnly, async (req, res) => {
  try {
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });
    const newStatus = existing.status === 'suspended' ? 'active' : 'suspended';
    await sequelize.query(
      "UPDATE `Licenses` SET status=?, updatedAt=? WHERE storeId=?",
      { replacements: [newStatus, new Date().toISOString(), req.params.storeId] }
    );
    res.json(await rawLicense(req.params.storeId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE cancel (superadmin only)
router.delete('/:storeId', superadminOnly, async (req, res) => {
  try {
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });
    await sequelize.query(
      "UPDATE `Licenses` SET status='cancelled', updatedAt=? WHERE storeId=?",
      { replacements: [new Date().toISOString(), req.params.storeId] }
    );
    res.json({ message: 'License cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST onboard new store (superadmin only) — creates store + admin user + license + Stripe customer
router.post('/onboard', superadminOnly, async (req, res) => {
  const { storeName, storeEmail, storePhone, storeAddress, storeCity, storeState, storeZip,
          adminName, adminEmail, adminPassword, stripePlanKey, notes } = req.body;
  if (!storeName || !adminEmail || !adminPassword)
    return res.status(400).json({ error: 'storeName, adminEmail, adminPassword required' });

  const stripe = getStripe();
  const t = await sequelize.transaction();
  try {
    const store = await Store.create({
      name: storeName, email: storeEmail, phone: storePhone,
      address: storeAddress, city: storeCity, state: storeState, zip: storeZip,
      taxRate: 0.0825,
    }, { transaction: t });

    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      storeId: store.id, name: adminName || 'Store Admin',
      email: adminEmail, passwordHash: hash, role: 'admin',
    }, { transaction: t });

    // Get plan details
    const planRow = stripePlanKey ? await StripePlan.findOne({ where: { key: stripePlanKey } }) : null;
    const planInterval = planRow?.interval === 'year' ? 'yearly' : 'monthly';
    const planPrice = planRow ? (planRow.amount / 100).toFixed(2) : 0;

    // Create Stripe customer
    let stripeCustomerId = null;
    let checkoutUrl = null;
    if (stripe && planRow?.stripePriceId) {
      const customer = await stripe.customers.create({
        name: storeName,
        email: storeEmail || adminEmail,
        metadata: { storeId: store.id },
      });
      stripeCustomerId = customer.id;

      // Create checkout session so store owner can enter their card
      const appUrl = process.env.APP_URL || 'https://celltechpos.com';
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        line_items: [{ price: planRow.stripePriceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { storeId: store.id },
        },
        metadata: { storeId: store.id },
        success_url: `${appUrl}/login?welcome=1`,
        cancel_url: `${appUrl}/login`,
      });
      checkoutUrl = session.url;
    }

    // Trial expiry: 14 days
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    await License.create({
      storeId: store.id, plan: planInterval, status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: expiry.toISOString(),
      price: planPrice, autoRenew: !!stripe,
      notes, stripeCustomerId,
      stripeStatus: stripeCustomerId ? 'trialing' : null,
      stripePlanKey: stripePlanKey || null,
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ storeId: store.id, checkoutUrl, message: 'Store onboarded' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

// GET store details (superadmin only)
router.get('/:storeId/details', superadminOnly, async (req, res) => {
  try {
    const lic = await rawLicense(req.params.storeId);
    if (!lic) return res.status(404).json({ error: 'Not found' });
    const [users] = await sequelize.query(
      'SELECT id, name, email, role, active, createdAt FROM `Users` WHERE storeId = ? ORDER BY role, name',
      { replacements: [req.params.storeId] }
    );
    const [counts] = await sequelize.query(
      `SELECT
        (SELECT COUNT(*) FROM RepairTickets WHERE storeId=?) as repairs,
        (SELECT COUNT(*) FROM Customers WHERE storeId=?) as customers,
        (SELECT COUNT(*) FROM Transactions WHERE storeId=?) as transactions`,
      { replacements: [req.params.storeId, req.params.storeId, req.params.storeId] }
    );
    lic.daysLeft = daysUntil(lic.expiresAt);
    res.json({ license: lic, users, stats: counts[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST impersonate a store — superadmin logs in as that store's admin (superadmin only)
router.post('/:storeId/impersonate', superadminOnly, async (req, res) => {
  try {
    const [userRows] = await sequelize.query(
      `SELECT u.*, s.name as storeName, s.email as storeEmail FROM \`Users\` u
       LEFT JOIN \`Stores\` s ON u.storeId = s.id
       WHERE u.storeId=? AND u.role='admin' AND u.active=1
       ORDER BY u.createdAt ASC LIMIT 1`,
      { replacements: [req.params.storeId] }
    );
    const userRow = userRows[0];
    if (!userRow) return res.status(404).json({ error: 'No admin user found for this store' });

    const lic = await rawLicense(req.params.storeId);
    const plan = getPlanTier(lic);

    const payload = { id: userRow.id, role: userRow.role, storeId: userRow.storeId, name: userRow.name };
    const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4h' });
    const refreshToken = jwt.sign({ id: userRow.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: userRow.id, name: userRow.name, email: userRow.email,
        role: userRow.role, storeId: userRow.storeId,
        store: { id: userRow.storeId, name: userRow.storeName, email: userRow.storeEmail },
      },
      plan,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST generate payment/checkout link for an existing store (superadmin only)
router.post('/:storeId/payment-link', superadminOnly, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const lic = await rawLicense(req.params.storeId);
    if (!lic) return res.status(404).json({ error: 'License not found' });

    const { stripePlanKey } = req.body;
    const planKey = stripePlanKey || lic.stripePlanKey;
    const planRow = planKey ? await StripePlan.findOne({ where: { key: planKey } }) : null;
    if (!planRow?.stripePriceId) return res.status(400).json({ error: 'No Stripe plan configured for this store' });

    // Ensure customer exists
    let customerId = lic.stripeCustomerId;
    if (!customerId) {
      const [storeRows] = await sequelize.query('SELECT * FROM `Stores` WHERE id=? LIMIT 1', { replacements: [req.params.storeId] });
      const store = storeRows[0];
      const customer = await stripe.customers.create({
        name: store?.name, email: store?.email,
        metadata: { storeId: req.params.storeId },
      });
      customerId = customer.id;
      await sequelize.query(
        'UPDATE `Licenses` SET stripeCustomerId=?, stripePlanKey=?, updatedAt=? WHERE storeId=?',
        { replacements: [customerId, planKey, new Date().toISOString(), req.params.storeId] }
      );
    }

    const appUrl = process.env.APP_URL || 'https://celltechpos.com';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planRow.stripePriceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14, metadata: { storeId: req.params.storeId } },
      metadata: { storeId: req.params.storeId },
      success_url: `${appUrl}/login?welcome=1`,
      cancel_url: `${appUrl}/login`,
    });
    res.json({ checkoutUrl: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST cancel Stripe subscription (superadmin only)
router.post('/:storeId/cancel-stripe', superadminOnly, async (req, res) => {
  const stripe = getStripe();
  try {
    const lic = await rawLicense(req.params.storeId);
    if (!lic) return res.status(404).json({ error: 'Not found' });
    if (stripe && lic.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(lic.stripeSubscriptionId);
    }
    await sequelize.query(
      "UPDATE `Licenses` SET status='cancelled', stripeStatus='cancelled', updatedAt=? WHERE storeId=?",
      { replacements: [new Date().toISOString(), req.params.storeId] }
    );
    res.json({ message: 'Cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST mark as paid manually — Zelle, cash, check, etc. (superadmin only)
router.post('/:storeId/mark-paid', superadminOnly, async (req, res) => {
  try {
    const { price, period, note } = req.body; // period: 'month' | 'year'
    const existing = await rawLicense(req.params.storeId);
    if (!existing) return res.status(404).json({ error: 'License not found' });

    const base = existing.expiresAt && new Date(existing.expiresAt) > new Date()
      ? new Date(existing.expiresAt) : new Date();

    const ext = period === 'year' ? 'yearly' : 'monthly';
    if (period === 'year') base.setFullYear(base.getFullYear() + 1);
    else base.setMonth(base.getMonth() + 1);

    const now = new Date().toISOString();
    await sequelize.query(
      `UPDATE \`Licenses\` SET expiresAt=?, status='active', plan=?, lastPaidAt=?, price=?, notes=?, updatedAt=? WHERE storeId=?`,
      { replacements: [base.toISOString(), ext, now, price || existing.price || 0, note || existing.notes || null, now, req.params.storeId] }
    );
    const result = await rawLicense(req.params.storeId);
    result.daysLeft = daysUntil(result.expiresAt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST generate PayPal subscription approval link (superadmin only)
router.post('/:storeId/paypal-link', superadminOnly, async (req, res) => {
  if (!paypalConfigured()) return res.status(503).json({ error: 'PayPal not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your server .env' });
  try {
    const lic = await rawLicense(req.params.storeId);
    if (!lic) return res.status(404).json({ error: 'License not found' });

    const { stripePlanKey } = req.body;
    const planKey = stripePlanKey || lic.stripePlanKey;
    const planRow = planKey ? await StripePlan.findOne({ where: { key: planKey } }) : null;
    if (!planRow?.paypalPlanId) return res.status(400).json({ error: 'No PayPal plan configured for this tier. Make sure PAYPAL_CLIENT_ID/SECRET are set and restart the server.' });

    const appUrl = process.env.APP_URL || 'https://celltechpos.com';
    const { subscriptionId, approvalUrl } = await createPayPalSubscription(planRow.paypalPlanId, req.params.storeId, appUrl);

    await sequelize.query(
      'UPDATE `Licenses` SET paypalSubscriptionId=?, paypalStatus=?, stripePlanKey=?, updatedAt=? WHERE storeId=?',
      { replacements: [subscriptionId, 'APPROVAL_PENDING', planKey || lic.stripePlanKey, new Date().toISOString(), req.params.storeId] }
    );

    res.json({ approvalUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Self-service billing ──────────────────────────────────────────────────────

// GET all active Stripe plans (any authenticated user — for billing page)
router.get('/stripe-plans', async (req, res) => {
  try {
    const plans = await StripePlan.findAll({
      attributes: ['id', 'key', 'label', 'amount', 'interval'],
      order: [['interval', 'ASC'], ['amount', 'ASC']],
    });
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET billing portal session for active subscriber
router.get('/portal', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  try {
    const lic = await rawLicense(req.user.storeId);
    if (!lic?.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer found' });
    const appUrl = process.env.APP_URL || 'https://celltechpos.com';
    const session = await stripe.billingPortal.sessions.create({
      customer: lic.stripeCustomerId,
      return_url: `${appUrl}/app/billing`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /self-checkout — store owner initiates their own Stripe checkout session
router.post('/self-checkout', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const { planKey } = req.body;
  if (!planKey) return res.status(400).json({ error: 'planKey is required' });

  try {
    const planRow = await StripePlan.findOne({ where: { key: planKey } });
    if (!planRow) return res.status(404).json({ error: `Plan "${planKey}" not found` });
    if (!planRow.stripePriceId) {
      return res.status(400).json({ error: `Plan "${planKey}" has no Stripe price configured. Contact support.` });
    }

    const store = await Store.findByPk(req.user.storeId);
    const lic = await rawLicense(req.user.storeId);
    const appUrl = process.env.APP_URL || 'https://celltechpos.com';

    // Best email: user's login email > store email
    const bestEmail = req.user.email || store?.email || null;
    const customerName = store?.name || req.user.name || null;

    // Reuse or create Stripe customer so name/email are pre-filled
    let customerId = lic?.stripeCustomerId || null;
    if (customerId) {
      try { await stripe.customers.retrieve(customerId); }
      catch { customerId = null; }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: customerName,
        email: bestEmail,
        metadata: { storeId: req.user.storeId },
      });
      customerId = customer.id;
      await sequelize.query(
        'UPDATE `Licenses` SET stripeCustomerId=?, updatedAt=? WHERE storeId=?',
        { replacements: [customerId, new Date().toISOString(), req.user.storeId] }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planRow.stripePriceId, quantity: 1 }],
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${appUrl}/app/billing?success=true`,
      cancel_url: `${appUrl}/app/billing`,
      metadata: { storeId: req.user.storeId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Self-checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe Plan Management (superadmin) ───────────────────────────────────────

// PUT update plan price (creates new Stripe price, keeps product)
router.put('/stripe-plans/:key', superadminOnly, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const plan = await StripePlan.findOne({ where: { key: req.params.key } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const { amount, label } = req.body;
    const newAmount = parseInt(amount);
    if (!newAmount || newAmount < 100) return res.status(400).json({ error: 'Amount must be at least 100 cents ($1.00)' });

    // Archive old Stripe price and create new one
    if (plan.stripePriceId) {
      await stripe.prices.update(plan.stripePriceId, { active: false }).catch(() => {});
    }
    const newPrice = await stripe.prices.create({
      product: plan.stripeProductId,
      unit_amount: newAmount,
      currency: 'usd',
      recurring: { interval: plan.interval },
      lookup_key: plan.key,
      transfer_lookup_key: true,
    });

    await plan.update({
      amount: newAmount,
      label: label || plan.label,
      stripePriceId: newPrice.id,
    });

    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET full report data (superadmin only)
router.get('/stats/report', superadminOnly, async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    const all = await rawAllLicenses();
    const now = new Date();

    for (const lic of all) {
      if (lic.status === 'active' && lic.expiresAt && now > new Date(lic.expiresAt)) lic.status = 'expired';
      lic.daysLeft = daysUntil(lic.expiresAt);
    }

    const active    = all.filter(l => l.status === 'active');
    const monthly   = active.filter(l => l.plan === 'monthly');
    const yearly    = active.filter(l => l.plan === 'yearly');
    const mrr = monthly.reduce((s, l) => s + parseFloat(l.price || 0), 0)
              + yearly.reduce((s,  l) => s + parseFloat(l.price || 0) / 12, 0);

    // New subscribers per month
    const [growth] = await sequelize.query(`
      SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as newStores
      FROM \`Licenses\`
      WHERE createdAt >= datetime('now', '-${months} months')
      GROUP BY month ORDER BY month ASC`);

    // Revenue by month (from lastPaidAt)
    const [revenue] = await sequelize.query(`
      SELECT strftime('%Y-%m', lastPaidAt) as month,
             ROUND(SUM(CAST(price AS REAL)), 2) as revenue,
             COUNT(*) as payments
      FROM \`Licenses\`
      WHERE lastPaidAt >= datetime('now', '-${months} months')
        AND price > 0 AND lastPaidAt IS NOT NULL
      GROUP BY month ORDER BY month ASC`);

    // Plan distribution
    const planDist = {};
    for (const l of active) {
      const key = l.stripePlanKey ? l.stripePlanKey.replace(/_/g,' ') : l.plan;
      planDist[key] = (planDist[key] || 0) + 1;
    }
    const planDistribution = Object.entries(planDist).map(([name, value]) => ({ name, value }));

    // Status breakdown
    const statusBreakdown = [
      { name:'Active',    value: active.length,                                  color:'#10b981' },
      { name:'Expired',   value: all.filter(l => l.status === 'expired').length,  color:'#ef4444' },
      { name:'Suspended', value: all.filter(l => l.status === 'suspended').length, color:'#f59e0b' },
      { name:'Cancelled', value: all.filter(l => l.status === 'cancelled').length, color:'#374151' },
    ];

    // Expiring in next 30 days
    const [expiringSoon] = await sequelize.query(`
      SELECT l.storeId, l.plan, l.status, l.expiresAt, l.price, l.stripePlanKey,
             s.name as storeName, s.email as storeEmail
      FROM \`Licenses\` l LEFT JOIN \`Stores\` s ON l.storeId = s.id
      WHERE l.status = 'active'
        AND l.expiresAt BETWEEN datetime('now') AND datetime('now', '+30 days')
      ORDER BY l.expiresAt ASC LIMIT 15`);

    // Recent payments
    const [recentPayments] = await sequelize.query(`
      SELECT l.storeId, l.plan, l.price, l.lastPaidAt, l.stripePlanKey, l.stripeStatus, l.paypalStatus,
             s.name as storeName
      FROM \`Licenses\` l LEFT JOIN \`Stores\` s ON l.storeId = s.id
      WHERE l.lastPaidAt IS NOT NULL AND l.price > 0
      ORDER BY l.lastPaidAt DESC LIMIT 10`);

    res.json({
      summary: {
        totalStores: all.length, activeStores: active.length,
        mrr: parseFloat(mrr.toFixed(2)), arr: parseFloat((mrr * 12).toFixed(2)),
        monthly: monthly.length, yearly: yearly.length,
        expired: all.filter(l => l.status === 'expired').length,
        suspended: all.filter(l => l.status === 'suspended').length,
      },
      growth, revenue, planDistribution, statusBreakdown, expiringSoon, recentPayments,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET revenue stats (superadmin only)
router.get('/stats/revenue', superadminOnly, async (req, res) => {
  try {
    const all = await rawAllLicenses();
    const active  = all.filter(l => l.status === 'active');
    const monthly = active.filter(l => l.plan === 'monthly');
    const yearly  = active.filter(l => l.plan === 'yearly');
    const mrr = monthly.reduce((s, l) => s + parseFloat(l.price || 0), 0)
              + yearly.reduce((s, l) => s + parseFloat(l.price || 0) / 12, 0);

    const paidActive = active.filter(l => l.plan !== 'trial').length;
    const arpu = active.length > 0 ? parseFloat((mrr / active.length).toFixed(2)) : 0;
    const trialConversion = all.length > 0 ? Math.round((paidActive / all.length) * 100) : 0;

    const [churnRows] = await sequelize.query(
      "SELECT COUNT(*) as cnt FROM `Licenses` WHERE (status='expired' OR status='cancelled') AND updatedAt >= datetime('now', '-30 days')"
    );
    const churned = churnRows[0]?.cnt || 0;
    const churnRate = all.length > 0 ? parseFloat((churned / all.length * 100).toFixed(1)) : 0;

    const [newMonthRows] = await sequelize.query(
      "SELECT COUNT(*) as cnt FROM `Licenses` WHERE strftime('%Y-%m', createdAt) = strftime('%Y-%m', 'now')"
    );
    const newThisMonth = newMonthRows[0]?.cnt || 0;

    const [atRiskRows] = await sequelize.query(
      "SELECT COUNT(*) as cnt FROM `Licenses` WHERE stripeStatus='past_due' OR status='suspended' OR (status='active' AND expiresAt IS NOT NULL AND expiresAt <= datetime('now', '+7 days') AND expiresAt > datetime('now'))"
    );
    const atRisk = atRiskRows[0]?.cnt || 0;

    res.json({
      totalStores:      all.length,
      activeStores:     active.length,
      monthly:          monthly.length,
      yearly:           yearly.length,
      trial:            active.filter(l => l.plan === 'trial').length,
      expired:          all.filter(l => l.status === 'expired').length,
      suspended:        all.filter(l => l.status === 'suspended').length,
      mrr:              parseFloat(mrr.toFixed(2)),
      arr:              parseFloat((mrr * 12).toFixed(2)),
      arpu,
      churnRate,
      trialConversion,
      newThisMonth,
      atRisk,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET at-risk stores (superadmin only)
router.get('/at-risk', superadminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT l.*, s.name as storeName, s.email as storeEmail, s.phone as storePhone
       FROM \`Licenses\` l LEFT JOIN \`Stores\` s ON l.storeId = s.id
       WHERE l.stripeStatus='past_due'
          OR l.status='suspended'
          OR (l.status='active' AND l.expiresAt IS NOT NULL
              AND l.expiresAt <= datetime('now', '+7 days')
              AND l.expiresAt > datetime('now'))
       ORDER BY l.expiresAt ASC LIMIT 25`
    );
    rows.forEach(r => { r.daysLeft = daysUntil(r.expiresAt); });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
