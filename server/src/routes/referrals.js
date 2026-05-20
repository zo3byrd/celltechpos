const router = require('express').Router();
const { sequelize } = require('../db');
const { Referral } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');
const { sendEmail } = require('../integrations/messaging');

router.use(auth);

const superadminOnly = requireRole('superadmin');

// GET /my and /summary — current store's referral code, link, and stats
router.get(['/my', '/summary'], async (req, res) => {
  try {
    const [licRows] = await sequelize.query(
      'SELECT referralCode, referredBy FROM `Licenses` WHERE storeId=? LIMIT 1',
      { replacements: [req.user.storeId] }
    );
    const lic = licRows[0];
    if (!lic) return res.status(404).json({ error: 'License not found' });

    const code = lic.referralCode;
    const appUrl = process.env.APP_URL || 'https://celltechpos.com';
    const referralUrl = `${appUrl}/signup?ref=${code}`;

    const [refs] = await sequelize.query(
      `SELECT r.*, s.name as refereeName
       FROM \`Referrals\` r
       LEFT JOIN \`Stores\` s ON r.refereeStoreId = s.id
       WHERE r.referrerStoreId=?
       ORDER BY r.createdAt DESC`,
      { replacements: [req.user.storeId] }
    );

    const total    = refs.length;
    const rewarded = refs.filter(r => r.status === 'rewarded').length;
    const pending  = total - rewarded;
    const rewardDays = refs.reduce((s, r) => s + (r.status === 'rewarded' ? (r.rewardDays || 30) : 0), 0);

    res.json({ code, referralUrl, stats: { total, rewarded, pending, rewardDays }, referrals: refs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET / — superadmin only — all referrals
router.get('/', superadminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT r.*,
             sr.name as referrerName, sr.email as referrerEmail,
             se.name as refereeName,  se.email as refereeEmail
      FROM \`Referrals\` r
      LEFT JOIN \`Stores\` sr ON r.referrerStoreId = sr.id
      LEFT JOIN \`Stores\` se ON r.refereeStoreId  = se.id
      ORDER BY r.createdAt DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /:id/reward — superadmin manually rewards a pending referral
router.post('/:id/reward', superadminOnly, async (req, res) => {
  try {
    const ref = await Referral.findByPk(req.params.id);
    if (!ref) return res.status(404).json({ error: 'Referral not found' });
    if (ref.status === 'rewarded') return res.status(400).json({ error: 'Already rewarded' });

    await rewardReferrer(ref.referrerStoreId, ref.id, ref.rewardDays || 30);
    res.json({ message: 'Rewarded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Shared reward logic — called from here and from stripeWebhook.js
async function rewardReferrer(referrerStoreId, referralId, days = 30) {
  const [licRows] = await sequelize.query(
    'SELECT expiresAt, status FROM `Licenses` WHERE storeId=? LIMIT 1',
    { replacements: [referrerStoreId] }
  );
  const lic = licRows[0];
  if (!lic) return;

  const base = lic.expiresAt && new Date(lic.expiresAt) > new Date()
    ? new Date(lic.expiresAt) : new Date();
  base.setDate(base.getDate() + days);

  const now = new Date().toISOString();
  await sequelize.query(
    "UPDATE `Licenses` SET expiresAt=?, status='active', updatedAt=? WHERE storeId=?",
    { replacements: [base.toISOString(), now, referrerStoreId] }
  );
  await sequelize.query(
    "UPDATE `Referrals` SET status='rewarded', rewardedAt=?, updatedAt=? WHERE id=?",
    { replacements: [now, now, referralId] }
  );

  // Email referrer
  try {
    const [adminRows] = await sequelize.query(
      "SELECT u.email, u.name, s.name as storeName FROM `Users` u JOIN `Stores` s ON u.storeId=s.id WHERE u.storeId=? AND u.role IN ('admin','superadmin') ORDER BY u.createdAt ASC LIMIT 1",
      { replacements: [referrerStoreId] }
    );
    const admin = adminRows[0];
    if (admin?.email) {
      const appUrl = process.env.APP_URL || 'https://celltechpos.com';
      await sendEmail(
        admin.email,
        'Your referral earned you a free month! 🎉 — CellTechPOS',
        `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1f2937;background:#f9fafb">
<div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
  <h1 style="margin:0 0 4px 0;font-size:28px;color:#2dd4bf;letter-spacing:1px">CELLTECHPOS</h1>
  <p style="margin:0 0 24px 0;color:#6b7280;font-size:13px">Referral Reward</p>
  <h2 style="margin:0 0 12px 0;font-size:22px;color:#111827">🎉 Your referral subscribed!</h2>
  <p style="font-size:15px;line-height:1.6;color:#374151">Hi ${admin.name},</p>
  <p style="font-size:15px;line-height:1.6;color:#374151">
    A store you referred just became a paying CellTechPOS customer.
    As a thank-you, we've added <strong>${days} days free</strong> to your subscription for <strong>${admin.storeName}</strong>.
  </p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0">
    <p style="margin:0;font-size:14px;color:#166534;font-weight:600">✅ ${days} days added to your account</p>
    <p style="margin:6px 0 0;font-size:13px;color:#15803d">Keep referring and keep earning!</p>
  </div>
  <a href="${appUrl}/app/referrals"
     style="display:inline-block;margin-top:8px;padding:12px 28px;background:#2dd4bf;color:#fff;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none">
    View your referrals →
  </a>
</div></body></html>`
      );
    }
  } catch { /* non-fatal */ }
}

module.exports = router;
module.exports.rewardReferrer = rewardReferrer;
