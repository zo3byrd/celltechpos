const { sequelize } = require('../db');

async function updateLicense(storeId, fields) {
  const sets = Object.keys(fields).map(k => `\`${k}\`=?`).join(', ');
  const vals = [...Object.values(fields), new Date().toISOString(), storeId];
  await sequelize.query(
    `UPDATE \`Licenses\` SET ${sets}, updatedAt=? WHERE storeId=?`,
    { replacements: vals }
  );
}

async function getLicenseByPaypalSub(subscriptionId) {
  const [rows] = await sequelize.query(
    'SELECT * FROM `Licenses` WHERE paypalSubscriptionId = ? LIMIT 1',
    { replacements: [subscriptionId] }
  );
  return rows[0] || null;
}

module.exports = async (req, res) => {
  if (!process.env.PAYPAL_CLIENT_ID) return res.status(503).json({ error: 'PayPal not configured' });

  const event = req.body;
  if (!event?.event_type) return res.status(400).json({ error: 'Invalid event' });

  try {
    const resource = event.resource;

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        // custom_id = storeId set when creating the subscription
        const storeId = resource?.custom_id;
        if (!storeId) break;
        const nextBilling = resource.billing_info?.next_billing_time;
        await updateLicense(storeId, {
          paypalSubscriptionId: resource.id,
          paypalStatus: 'ACTIVE',
          status: 'active',
          ...(nextBilling && { expiresAt: new Date(nextBilling).toISOString() }),
        });
        console.log(`PayPal activated: store ${storeId}, sub ${resource.id}`);
        break;
      }

      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const lic = await getLicenseByPaypalSub(resource?.id);
        if (!lic) break;
        const nextBilling = resource.billing_info?.next_billing_time;
        await updateLicense(lic.storeId, {
          paypalStatus: resource.status || 'ACTIVE',
          ...(nextBilling && { expiresAt: new Date(nextBilling).toISOString() }),
        });
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        const subId = resource?.billing_agreement_id;
        if (!subId) break;
        const lic = await getLicenseByPaypalSub(subId);
        if (!lic) break;
        const amount = parseFloat(resource?.amount?.total || 0);
        await updateLicense(lic.storeId, {
          status: 'active',
          paypalStatus: 'ACTIVE',
          lastPaidAt: new Date().toISOString(),
          ...(amount > 0 && { price: amount.toFixed(2) }),
        });
        console.log(`PayPal payment received: store ${lic.storeId}`);
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const lic = await getLicenseByPaypalSub(resource?.id);
        if (!lic) break;
        await updateLicense(lic.storeId, { status: 'cancelled', paypalStatus: 'CANCELLED' });
        console.log(`PayPal subscription cancelled: store ${lic.storeId}`);
        break;
      }

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const storeId = resource?.custom_id;
        if (storeId) await updateLicense(storeId, { paypalStatus: 'SUSPENDED' });
        break;
      }
    }
  } catch (err) {
    console.error('PayPal webhook error:', err);
  }

  res.json({ received: true });
};
