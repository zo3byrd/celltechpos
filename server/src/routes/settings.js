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
  for (const [key, value] of Object.entries(req.body)) {
    await Setting.upsert({ key, value: String(value) });
  }
  const rows = await Setting.findAll();
  const settings = { ...DEFAULTS };
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

module.exports = router;
