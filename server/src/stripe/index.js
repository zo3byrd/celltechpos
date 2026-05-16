const Stripe = require('stripe');

let _stripe;
function getStripe() {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

const DEFAULT_PLANS = [
  { key: 'starter_monthly', label: 'Starter',                  amount: 4999,  interval: 'month', product: 'CellTechPOS Starter' },
  { key: 'pro_monthly',     label: 'Pro',                      amount: 5999,  interval: 'month', product: 'CellTechPOS Pro' },
  { key: 'multi_monthly',   label: 'Multi-Location',           amount: 7999,  interval: 'month', product: 'CellTechPOS Multi-Location' },
  { key: 'starter_yearly',  label: 'Starter (Annual)',         amount: 49990, interval: 'year',  product: 'CellTechPOS Starter' },
  { key: 'pro_yearly',      label: 'Pro (Annual)',             amount: 59990, interval: 'year',  product: 'CellTechPOS Pro' },
  { key: 'multi_yearly',    label: 'Multi-Location (Annual)',  amount: 79990, interval: 'year',  product: 'CellTechPOS Multi-Location' },
];

async function ensurePlans(sequelize) {
  const stripe = getStripe();
  if (!stripe) return;

  const { StripePlan } = require('../db/models');

  for (const plan of DEFAULT_PLANS) {
    const existing = await StripePlan.findOne({ where: { key: plan.key } });

    // Skip if price is already correct amount
    if (existing?.stripePriceId && existing.amount === plan.amount) continue;

    try {
      // Find or create the Stripe product
      const products = await stripe.products.search({ query: `name:"${plan.product}"`, limit: 1 });
      let productId;
      if (products.data.length > 0) {
        productId = products.data[0].id;
      } else {
        const product = await stripe.products.create({ name: plan.product });
        productId = product.id;
      }

      // Archive old price if amount changed, then create new one
      if (existing?.stripePriceId && existing.amount !== plan.amount) {
        try {
          await stripe.prices.update(existing.stripePriceId, { active: false });
        } catch (_) { /* ignore if already archived */ }
      }

      // Create new price with updated amount
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: { interval: plan.interval },
        lookup_key: plan.key,
        transfer_lookup_key: true,
      });
      console.log(`  + Stripe: ${existing ? 'updated' : 'created'} price ${plan.key} → ${price.id} ($${(plan.amount / 100).toFixed(2)})`);

      if (existing) {
        await existing.update({ amount: plan.amount, stripePriceId: price.id, stripeProductId: productId });
      } else {
        await StripePlan.create({
          key: plan.key, label: plan.label,
          amount: plan.amount, interval: plan.interval,
          stripePriceId: price.id, stripeProductId: productId,
          active: true,
        });
      }
    } catch (err) {
      console.warn(`  ! Stripe plan setup skipped (${plan.key}): ${err.message}`);
    }
  }
}

module.exports = { getStripe, ensurePlans, DEFAULT_PLANS };
