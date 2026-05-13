const { sequelize } = require('../db');

async function checkLicense(req, res, next) {
  if (req.user?.role === 'superadmin') return next();

  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM `Licenses` WHERE storeId = ? LIMIT 1',
      { replacements: [req.user.storeId] }
    );
    const license = rows[0];

    if (!license || license.status === 'cancelled') {
      return res.status(402).json({ code: 'NO_LICENSE', error: 'No active subscription. Contact support to activate.' });
    }
    if (license.status === 'suspended') {
      return res.status(402).json({ code: 'SUSPENDED', error: 'Account suspended. Contact support.' });
    }
    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      await sequelize.query(
        "UPDATE `Licenses` SET status='expired', updatedAt=? WHERE storeId=?",
        { replacements: [new Date().toISOString(), req.user.storeId] }
      );
      return res.status(402).json({ code: 'EXPIRED', error: 'Subscription expired.', expiresAt: license.expiresAt });
    }

    req.license = license;
    next();
  } catch {
    next(); // fail open on DB error
  }
}

module.exports = { checkLicense };
