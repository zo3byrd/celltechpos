const { getStripe } = require('../stripe');
const { sequelize } = require('../db');

function daysUntil(isoStr) {
  if (!isoStr) return null;
  return Math.ceil((new Date(isoStr) - new Date()) / 86400000);
}

async function getLicenseBySubscription(subscriptionId) {
  const [rows] = await sequelize.query(
    'SELECT * FROM `Licenses` WHERE stripeSubscriptionId = ? LIMIT 1',
    { replacements: [subscriptionId] }
  );
  return rows[0] || null;
}

async function getLicenseByCustomer(customerId) {
  const [rows] = await sequelize.query(
    'SELECT * FROM `Licenses` WHERE stripeCustomerId = ? LIMIT 1',
    { replacements: [customerId] }
  );
  return rows[0] || null;
}

async function updateLicense(storeId, fields) {
  const sets = Object.keys(fields).map(k => `\`${k}\`=?`).join(', ');
  const vals = [...Object.values(fields), new Date().toISOString(), storeId];
  await sequelize.query(
    `UPDATE \`Licenses\` SET ${sets}, updatedAt=? WHERE storeId=?`,
    { replacements: vals }
  );
}

module.exports = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const storeId = session.metadata?.storeId;
        if (!storeId) break;
        const subscriptionId = session.subscription;
        await updateLicense(storeId, {
          stripeSubscriptionId: subscriptionId,
          stripeStatus: 'active',
          status: 'active',
        });
        console.log(`Stripe checkout completed: store ${storeId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const lic = await getLicenseBySubscription(invoice.subscription);
        if (!lic) break;
        // Extend license by billing period
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const newExpiry = new Date(sub.current_period_end * 1000).toISOString();
        await updateLicense(lic.storeId, {
          status: 'active',
          stripeStatus: 'active',
          expiresAt: newExpiry,
          lastPaidAt: new Date().toISOString(),
          price: (invoice.amount_paid / 100).toFixed(2),
        });
        console.log(`Payment succeeded: store ${lic.storeId}, expires ${newExpiry}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const lic = await getLicenseBySubscription(invoice.subscription);
        if (!lic) break;
        await updateLicense(lic.storeId, { stripeStatus: 'past_due' });
        console.log(`Payment failed: store ${lic.storeId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const lic = await getLicenseBySubscription(sub.id) || await getLicenseByCustomer(sub.customer);
        if (!lic) break;
        await updateLicense(lic.storeId, { status: 'cancelled', stripeStatus: 'cancelled' });
        console.log(`Subscription cancelled: store ${lic.storeId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const lic = await getLicenseBySubscription(sub.id);
        if (!lic) break;
        const newExpiry = new Date(sub.current_period_end * 1000).toISOString();
        const stripeStatus = sub.status;
        const status = ['active', 'trialing'].includes(sub.status) ? 'active'
          : sub.status === 'past_due' ? lic.status
          : 'expired';
        await updateLicense(lic.storeId, { stripeStatus, status, expiresAt: newExpiry });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
};
