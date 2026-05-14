const PAYPAL_BASE = () =>
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

function isConfigured() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function getAccessToken() {
  if (!isConfigured()) return null;
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch(`${PAYPAL_BASE()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function ppFetch(method, path, body, token) {
  const res = await fetch(`${PAYPAL_BASE()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `ctp-${Date.now()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// Products — one per tier (starter/pro/multi)
const TIER_PRODUCTS = [
  { key: 'starter', name: 'CellTechPOS Starter', description: 'Starter plan for small repair shops' },
  { key: 'pro',     name: 'CellTechPOS Pro',     description: 'Pro plan for growing stores' },
  { key: 'multi',   name: 'CellTechPOS Multi',   description: 'Multi-location plan' },
];

async function getOrCreateProduct(tierKey, token) {
  const tpl = TIER_PRODUCTS.find(t => t.key === tierKey);
  if (!tpl) return null;

  const list = await ppFetch('GET', `/v1/catalogs/products?page_size=20&page=1`, null, token);
  const found = list.products?.find(p => p.name === tpl.name);
  if (found) return found.id;

  const created = await ppFetch('POST', '/v1/catalogs/products', {
    name: tpl.name, description: tpl.description,
    type: 'SERVICE', category: 'SOFTWARE',
  }, token);
  console.log(`  + PayPal: created product ${tpl.name} → ${created.id}`);
  return created.id;
}

async function ensurePayPalPlans(sequelize) {
  if (!isConfigured()) {
    console.log('PayPal: PAYPAL_CLIENT_ID/SECRET not set — skipping');
    return;
  }
  let token;
  try { token = await getAccessToken(); } catch (e) {
    console.warn('PayPal: could not get access token —', e.message);
    return;
  }

  const { StripePlan } = require('../db/models');
  const plans = await StripePlan.findAll({ where: { active: true } });

  for (const plan of plans) {
    if (plan.paypalPlanId) continue;
    const tierKey = plan.key.split('_')[0];
    const productId = await getOrCreateProduct(tierKey, token);
    if (!productId) continue;

    const intervalUnit = plan.interval === 'month' ? 'MONTH' : 'YEAR';
    const amountStr = (plan.amount / 100).toFixed(2);

    const ppPlan = await ppFetch('POST', '/v1/billing/plans', {
      product_id: productId,
      name: plan.label,
      description: plan.label,
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: intervalUnit, interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: amountStr, currency_code: 'USD' } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }, token);

    if (ppPlan.id) {
      await plan.update({ paypalPlanId: ppPlan.id });
      console.log(`  + PayPal: created billing plan ${plan.key} → ${ppPlan.id}`);
    } else {
      console.warn(`  ! PayPal: plan creation failed for ${plan.key}:`, JSON.stringify(ppPlan));
    }
  }
  console.log('PayPal plans synced.');
}

async function createSubscription(paypalPlanId, storeId, appUrl) {
  const token = await getAccessToken();
  const sub = await ppFetch('POST', '/v1/billing/subscriptions', {
    plan_id: paypalPlanId,
    custom_id: storeId,
    application_context: {
      brand_name: 'CellTechPOS',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      return_url: `${appUrl}/login?paypal=success`,
      cancel_url: `${appUrl}/login?paypal=cancel`,
    },
  }, token);
  const approvalLink = sub.links?.find(l => l.rel === 'approve');
  if (!approvalLink) throw new Error(`PayPal subscription creation failed: ${JSON.stringify(sub)}`);
  return { subscriptionId: sub.id, approvalUrl: approvalLink.href };
}

module.exports = { isConfigured, getAccessToken, ppFetch, ensurePayPalPlans, createSubscription };
