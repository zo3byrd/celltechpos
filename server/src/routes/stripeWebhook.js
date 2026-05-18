const { getStripe } = require('../stripe');
const { sequelize } = require('../db');
const { sendEmail } = require('../integrations/messaging');
const { rewardReferrer } = require('./referrals');

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

async function getStoreAdminEmail(storeId) {
  const [rows] = await sequelize.query(
    "SELECT u.email, u.name, s.name as storeName FROM `Users` u JOIN `Stores` s ON u.storeId = s.id WHERE u.storeId = ? AND u.role IN ('admin','superadmin') ORDER BY u.createdAt ASC LIMIT 1",
    { replacements: [storeId] }
  );
  return rows[0] || null;
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

        const planKey = session.metadata?.planKey || null;
        const planInterval = planKey?.includes('yearly') || planKey?.includes('annual') ? 'yearly' : 'monthly';
        await updateLicense(storeId, {
          stripeSubscriptionId: session.subscription,
          stripeStatus: 'active',
          status: 'active',
          ...(planKey ? { plan: planInterval, stripePlanKey: planKey } : {}),
        });
        console.log(`Stripe checkout completed: store ${storeId}, plan ${planKey || 'unknown'}`);

        // Send subscription confirmation email
        try {
          const admin = await getStoreAdminEmail(storeId);
          const toEmail = session.customer_details?.email || admin?.email;
          if (toEmail) {
            const name = session.customer_details?.name || admin?.name || 'there';
            const storeName = admin?.storeName || 'Your Store';
            const amount = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : '';
            await sendEmail(
              toEmail,
              'Subscription Confirmed — CellTechPOS',
              `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1f2937;background:#f9fafb">
<div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
  <h1 style="margin:0 0 4px 0;font-size:28px;color:#2dd4bf;letter-spacing:1px">CELLTECHPOS</h1>
  <p style="margin:0 0 24px 0;color:#6b7280;font-size:13px">Your wireless POS solution</p>
  <h2 style="margin:0 0 12px 0;font-size:22px;color:#111827">🎉 You're subscribed!</h2>
  <p style="font-size:15px;line-height:1.6;color:#374151">Hi ${name},</p>
  <p style="font-size:15px;line-height:1.6;color:#374151">
    Thank you for subscribing to CellTechPOS for <strong>${storeName}</strong>.
    ${amount ? `Your payment of <strong>${amount}</strong> was processed successfully.` : ''}
  </p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0">
    <p style="margin:0;font-size:14px;color:#166534;font-weight:600">✅ Your account is now fully active</p>
    <p style="margin:6px 0 0;font-size:13px;color:#15803d">All features are unlocked and ready to use.</p>
  </div>
  <a href="${process.env.APP_URL || 'https://celltechpos.com'}/app"
     style="display:inline-block;margin-top:8px;padding:12px 28px;background:#2dd4bf;color:#fff;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none">
    Go to Dashboard →
  </a>
  <p style="margin-top:24px;font-size:13px;color:#6b7280">
    To manage your subscription, update payment info, or cancel, visit the
    <a href="${process.env.APP_URL || 'https://celltechpos.com'}/app/billing" style="color:#2dd4bf">Billing page</a>.
  </p>
</div></body></html>`
            );
          }
        } catch (emailErr) {
          console.warn('Checkout confirmation email failed (non-fatal):', emailErr.message);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const lic = await getLicenseBySubscription(invoice.subscription);
        if (!lic) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription, { expand: ['items.data.price'] });
        const newExpiry = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        // Look up plan key from the subscription price ID
        const priceId = sub.items?.data?.[0]?.price?.id;
        let planFields = {};
        if (priceId) {
          const [planRows] = await sequelize.query(
            'SELECT `key`, `interval` FROM `StripePlans` WHERE stripePriceId = ? LIMIT 1',
            { replacements: [priceId] }
          );
          if (planRows[0]) {
            planFields = {
              stripePlanKey: planRows[0].key,
              plan: planRows[0].interval === 'year' ? 'yearly' : 'monthly',
            };
          }
        }

        await updateLicense(lic.storeId, {
          status: 'active',
          stripeStatus: 'active',
          expiresAt: newExpiry,
          lastPaidAt: new Date().toISOString(),
          price: (invoice.amount_paid / 100).toFixed(2),
          ...planFields,
        });
        console.log(`Payment succeeded: store ${lic.storeId}, expires ${newExpiry}`);

        // On first subscription payment, check for a referral and reward the referrer
        if (invoice.billing_reason === 'subscription_create') {
          try {
            const [refRows] = await sequelize.query(
              "SELECT id, referrerStoreId, rewardDays FROM `Referrals` WHERE refereeStoreId=? AND status='pending' LIMIT 1",
              { replacements: [lic.storeId] }
            );
            if (refRows[0]) {
              await rewardReferrer(refRows[0].referrerStoreId, refRows[0].id, refRows[0].rewardDays || 30);
              console.log(`Referral rewarded: referrer ${refRows[0].referrerStoreId} earned ${refRows[0].rewardDays || 30} days`);
            }
          } catch (refErr) {
            console.warn('Referral reward failed (non-fatal):', refErr.message);
          }
        }

        // Send payment receipt (skip for first invoice — checkout.session.completed handles that)
        if (invoice.billing_reason !== 'subscription_create') {
          try {
            const admin = await getStoreAdminEmail(lic.storeId);
            if (admin?.email) {
              const amount = `$${(invoice.amount_paid / 100).toFixed(2)}`;
              const nextDate = new Date(newExpiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
              await sendEmail(
                admin.email,
                `Payment Receipt — ${amount} — CellTechPOS`,
                `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1f2937;background:#f9fafb">
<div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
  <h1 style="margin:0 0 4px 0;font-size:28px;color:#2dd4bf;letter-spacing:1px">CELLTECHPOS</h1>
  <p style="margin:0 0 24px 0;color:#6b7280;font-size:13px">Payment Receipt</p>
  <h2 style="margin:0 0 16px 0;font-size:20px;color:#111827">Payment Received</h2>
  <p style="font-size:15px;color:#374151">Hi ${admin.name},</p>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
      <span style="color:#6b7280;font-size:14px">Amount paid</span>
      <span style="font-weight:700;font-size:14px;color:#111827">${amount}</span>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span style="color:#6b7280;font-size:14px">Next renewal</span>
      <span style="font-size:14px;color:#111827">${nextDate}</span>
    </div>
  </div>
  <p style="font-size:13px;color:#6b7280;margin-top:20px">
    To manage your subscription visit the
    <a href="${process.env.APP_URL || 'https://celltechpos.com'}/app/billing" style="color:#2dd4bf">Billing page</a>.
  </p>
</div></body></html>`
              );
            }
          } catch (emailErr) {
            console.warn('Payment receipt email failed (non-fatal):', emailErr.message);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const lic = await getLicenseBySubscription(invoice.subscription);
        if (!lic) break;
        await updateLicense(lic.storeId, { stripeStatus: 'past_due' });
        console.log(`Payment failed: store ${lic.storeId}`);

        // Send payment failure warning
        try {
          const admin = await getStoreAdminEmail(lic.storeId);
          if (admin?.email) {
            await sendEmail(
              admin.email,
              'Payment Failed — Action Required — CellTechPOS',
              `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1f2937;background:#f9fafb">
<div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
  <h1 style="margin:0 0 4px 0;font-size:28px;color:#2dd4bf;letter-spacing:1px">CELLTECHPOS</h1>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0">
    <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600">⚠️ Your payment could not be processed</p>
    <p style="margin:6px 0 0;font-size:13px;color:#b91c1c">Please update your payment method to keep your account active.</p>
  </div>
  <a href="${process.env.APP_URL || 'https://celltechpos.com'}/app/billing"
     style="display:inline-block;padding:12px 28px;background:#ef4444;color:#fff;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none">
    Update Payment Method →
  </a>
</div></body></html>`
            );
          }
        } catch (emailErr) {
          console.warn('Payment failed email failed (non-fatal):', emailErr.message);
        }
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
        const newExpiry = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
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
