const router = require('express').Router();
const { Setting } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

const DEFAULTS = {
  platformName:    'CellTechPOS',
  supportEmail:    'support@celltechpos.com',
  supportPhone:    '',
  zelleEmail:      'Pcworldexchange@gmail.com',
  smtpHost:        '',
  smtpPort:        '587',
  smtpUser:        '',
  smtpPass:        '',
  smtpFromName:    'CellTechPOS',
  smtpFromEmail:   '',
  trialDays:       '14',
  autoSeedInventory: 'false',
  welcomeEmailSubject: 'Welcome to CellTechPOS!',
  welcomeEmailBody: 'Hi {{adminName}},\n\nWelcome to CellTechPOS! Your store {{storeName}} is now live.\n\nLogin at https://celltechpos.com/login\n\nEmail: {{adminEmail}}\n\nThank you!',
};

router.get('/', auth, requireRole('superadmin'), async (req, res) => {
  const rows = await Setting.findAll();
  const settings = { ...DEFAULTS };
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.put('/', auth, requireRole('superadmin'), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Setting.upsert({ key, value: String(value) });
    }
    const rows = await Setting.findAll();
    const settings = { ...DEFAULTS };
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    console.error('Settings save error:', err);
    res.status(500).json({ error: `Failed to save settings: ${err.message}` });
  }
});

// POST /api/settings/test-email — sends a real test email
// Accepts SMTP config in request body; falls back to DB-stored config
router.post('/test-email', auth, requireRole('superadmin'), async (req, res) => {
  const nodemailer = require('nodemailer');
  const rows = await Setting.findAll();
  const s = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;

  // Request body overrides DB values (allows testing before saving)
  const smtpHost      = req.body.smtpHost      || s.smtpHost;
  const smtpPort      = req.body.smtpPort      || s.smtpPort;
  const smtpUser      = req.body.smtpUser      || s.smtpUser;
  const smtpPass      = req.body.smtpPass      || s.smtpPass;
  const smtpFromName  = req.body.smtpFromName  || s.smtpFromName;
  const smtpFromEmail = req.body.smtpFromEmail || s.smtpFromEmail;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'SMTP is not configured. Fill in Host, Username, and Password first.' });
  }

  const port = parseInt(smtpPort || '587');
  const fromAddr = smtpFromEmail || smtpUser;
  const toAddr = req.user.email;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${smtpFromName || 'CellTechPOS'}" <${fromAddr}>`,
      to: toAddr,
      subject: `✅ CellTechPOS SMTP Test — ${new Date().toLocaleString()}`,
      html: `<div style="font-family:sans-serif;max-width:480px;padding:24px;background:#f9fafb;border-radius:8px">
        <h2 style="color:#166534;margin:0 0 12px">SMTP is working!</h2>
        <p style="color:#374151">This test email was sent from the CellTechPOS admin portal.</p>
        <table style="width:100%;font-size:13px;color:#6b7280;margin-top:16px">
          <tr><td style="padding:4px 0"><strong>Host:</strong></td><td>${smtpHost}:${port}</td></tr>
          <tr><td style="padding:4px 0"><strong>From:</strong></td><td>${fromAddr}</td></tr>
          <tr><td style="padding:4px 0"><strong>To:</strong></td><td>${toAddr}</td></tr>
          <tr><td style="padding:4px 0"><strong>Sent:</strong></td><td>${new Date().toISOString()}</td></tr>
        </table>
      </div>`,
      text: `SMTP test from CellTechPOS — sent to ${toAddr} at ${new Date().toISOString()}`,
    });

    res.json({ ok: true, to: toAddr, host: smtpHost });
  } catch (err) {
    res.status(400).json({ error: `SMTP error: ${err.message}` });
  }
});

module.exports = router;
