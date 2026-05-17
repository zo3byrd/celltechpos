const { sequelize } = require('../db');
const crypto = require('crypto');

// Map Coinbase Commerce charge status to license intervals
function intervalDays(interval) {
  return interval === 'year' ? 365 : 31;
}

module.exports = async function cryptoWebhookHandler(req, res) {
  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!secret) return res.sendStatus(200); // passthrough if not configured

  // Verify HMAC-SHA256 signature
  const sig = req.headers['x-cc-webhook-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing signature' });

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const type = event.event?.type;
  const charge = event.event?.data;
  if (!charge) return res.sendStatus(200);

  const { id: chargeId, code: chargeCode, metadata } = charge;
  const storeId = metadata?.storeId;
  const planKey = metadata?.planKey;
  const interval = metadata?.interval;

  if (!storeId) return res.sendStatus(200);

  try {
    if (type === 'charge:confirmed' || type === 'charge:resolved') {
      const days = intervalDays(interval);
      const [rows] = await sequelize.query(
        'SELECT expiresAt, status FROM `Licenses` WHERE storeId=? LIMIT 1',
        { replacements: [storeId] }
      );
      const lic = rows[0];
      const base = lic?.expiresAt && new Date(lic.expiresAt) > new Date()
        ? new Date(lic.expiresAt)
        : new Date();
      base.setDate(base.getDate() + days);

      const plan = days === 365 ? 'yearly' : 'monthly';
      const price = parseFloat(metadata?.price || 0);
      const now = new Date().toISOString();

      await sequelize.query(
        `UPDATE \`Licenses\`
         SET cryptoChargeId=?, cryptoChargeCode=?, cryptoStatus='CONFIRMED',
             stripePlanKey=?, plan=?, status='active',
             expiresAt=?, lastPaidAt=?, price=?, updatedAt=?
         WHERE storeId=?`,
        { replacements: [chargeId, chargeCode, planKey, plan, base.toISOString(), now, price, now, storeId] }
      );

      console.log(`[crypto] Charge confirmed for store ${storeId} — extended ${days}d`);

    } else if (type === 'charge:pending') {
      await sequelize.query(
        "UPDATE `Licenses` SET cryptoStatus='PENDING', updatedAt=? WHERE storeId=?",
        { replacements: [new Date().toISOString(), storeId] }
      );

    } else if (type === 'charge:failed') {
      await sequelize.query(
        "UPDATE `Licenses` SET cryptoStatus='FAILED', updatedAt=? WHERE storeId=?",
        { replacements: [new Date().toISOString(), storeId] }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[crypto webhook]', err);
    res.sendStatus(500);
  }
};
