const Stripe = require('stripe');

let _stripe;
function getStripe() {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

const DEFAULT_PLANS = [
  { key: 'starter_monthly', label: 'Starter',        amount: 4900,  interval: 'month', product: 'CellTechPOS Starter' },
  { key: 'pro_monthly',     label: 'Pro',             amount: 9900,  interval: 'month', product: 'CellTechPOS Pro' },
  { key: 'multi_monthly',   label: 'Multi-Location',  amount: 19900, interval: 'month', product: 'CellTechPOS Multi-Location' },
  { key: 'starter_yearly',  label: 'Starter (Annual)',amount: 47000, interval: 'year',  product: 'CellTechPOS Starter' },
  { key: 'pro_yearly',      label: 'Pro (Annual)',    amount: 95000, interval: 'year',  product: 'CellTechPOS Pro' },
  { key: 'multi_yearly',    label: 'Multi-Location (Annual)', amount: 190000, interval: 'year', product: 'CellTechPOS Multi-Location' },
];

async function ensurePlans(sequelize) {
  const stripe = getStripe();
  if (!stripe) return;

  const { StripePlan } = require('../db/models');

  for (const plan of DEFAULT_PLANS) {
    const existing = await StripePlan.findOne({ where: { key: plan.key } });
    if (existing?.stripePriceId) continue;

    try {
      const prices = await stripe.prices.list({ lookup_keys: [plan.key], limit: 1 });
      let priceId, productId;

      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
        productId = typeof prices.data[0].product === 'string'
          ? prices.data[0].product
          : prices.data[0].product.id;
      } else {
        // Find or create product by name
        const products = await stripe.products.search({ query: `name:"${plan.product}"`, limit: 1 });
        let product;
        if (products.data.length > 0) {
          product = products.data[0];
        } else {
          product = await stripe.products.create({ name: plan.product });
        }
        productId = product.id;

        const price = await stripe.prices.create({
          product: productId,
          unit_amount: plan.amount,
          currency: 'usd',
          recurring: { interval: plan.interval },
          lookup_key: plan.key,
          transfer_lookup_key: true,
        });
        priceId = price.id;
        console.log(`  + Stripe: created price ${plan.key} → ${priceId}`);
      }

      if (existing) {
        await existing.update({ stripePriceId: priceId, stripeProductId: productId });
      } else {
        await StripePlan.create({
          key: plan.key, label: plan.label,
          amount: plan.amount, interval: plan.interval,
          stripePriceId: priceId, stripeProductId: productId,
          active: true,
        });
      }
    } catch (err) {
      console.warn(`  ! Stripe plan setup skipped (${plan.key}): ${err.message}`);
    }
  }
}

module.exports = { getStripe, ensurePlans, DEFAULT_PLANS };
