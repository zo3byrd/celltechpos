const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { User, Store, License } = require('../db/models');
const { sequelize } = require('../db');
const { auth } = require('../middleware/auth');
const { sendEmail } = require('../integrations/messaging');

function getPlanTier(license) {
  if (!license || license.plan === 'trial') return 'trial';
  const key = (license.stripePlanKey || '').toLowerCase();
  if (key.includes('multi')) return 'multi';
  if (key.includes('pro')) return 'pro';
  return 'starter';
}

function signTokens(user) {
  const payload = { id: user.id, role: user.role, storeId: user.storeId, name: user.name };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// POST /refresh — issue new access token from refresh token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });
    User.findByPk(payload.id, { include: [{ model: Store }] }).then(user => {
      if (!user || !user.active) return res.status(401).json({ error: 'User not found' });
      const { accessToken, refreshToken: newRefreshToken } = signTokens(user);
      res.json({ token: accessToken, refreshToken: newRefreshToken });
    }).catch(() => res.status(500).json({ error: 'Server error' }));
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /signup — new store owner self-registration with 30-day trial
router.post('/signup',
  body('storeName').notEmpty().trim().withMessage('Store name is required'),
  body('name').notEmpty().trim().withMessage('Your name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').if(body('googleCredential').not().exists()).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { storeName, name, email, password, googleCredential, phone, city, state } = req.body;

    try {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

      let passwordHash;
      if (googleCredential) {
        const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleCredential}`);
        const gPayload = await gRes.json();
        if (gPayload.error || gPayload.email !== email) {
          return res.status(401).json({ error: 'Invalid Google credential' });
        }
        const crypto = require('crypto');
        passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      } else if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      } else {
        return res.status(400).json({ error: 'Password or Google sign-in is required' });
      }

      const store = await Store.create({
        id: uuidv4(), name: storeName.trim(),
        phone: phone?.trim() || null,
        city:  city?.trim()  || null,
        state: state?.trim() || null,
      });

      const user = await User.create({
        id: uuidv4(), storeId: store.id,
        name: name.trim(), email,
        passwordHash,
        role: 'admin', active: true,
      });

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      await License.create({
        id: uuidv4(), storeId: store.id,
        plan: 'trial', status: 'active',
        startedAt: new Date().toISOString(),
        expiresAt: trialEnd.toISOString(),
      });

      const { accessToken: token, refreshToken } = signTokens(user);

      // Send verification email (non-blocking — signup succeeds even if email fails)
      try {
        const verifyToken = jwt.sign(
          { id: user.id, purpose: 'verify' },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        const appUrl = process.env.APP_URL || 'https://celltechpos.com';
        const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
        const verifyHtml = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1f2937;background:#f9fafb">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <h1 style="margin:0 0 4px 0;font-size:28px;color:#2dd4bf;letter-spacing:1px">CELLTECHPPOS</h1>
    <p style="margin:0 0 24px 0;color:#6b7280;font-size:13px">Your wireless POS solution</p>
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827">Welcome, ${name.trim()}!</h2>
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px 0">
      Thank you for creating your <strong>CellTechPOS</strong> account for <strong>${storeName.trim()}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px 0">
      Your <strong>30-day free trial</strong> is now active — no credit card required. Explore all the features and see how CellTechPOS transforms your store.
    </p>
    <p style="font-size:15px;margin:0 0 24px 0">Please verify your email address to keep your account secure:</p>
    <div style="text-align:center;margin:0 0 32px 0">
      <a href="${verifyUrl}" style="display:inline-block;background:#2dd4bf;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.5px">Verify Email</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0 0 8px 0">Or copy this link into your browser:</p>
    <p style="font-size:12px;color:#9ca3af;word-break:break-all;margin:0 0 24px 0">${verifyUrl}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px 0">
    <p style="font-size:12px;color:#9ca3af;margin:0">This link expires in 7 days. If you did not create this account, you can safely ignore this email.</p>
  </div>
</body>
</html>`;
        await sendEmail(
          email,
          'Verify your CellTechPOS account',
          verifyHtml,
          `Welcome to CellTechPOS! Verify your email: ${verifyUrl}`
        );
      } catch (emailErr) {
        console.warn('Verification email failed (non-fatal):', emailErr.message);
      }

      res.status(201).json({
        token, refreshToken,
        user: {
          id: user.id, name: user.name, email: user.email,
          role: user.role, storeId: user.storeId,
          store: { id: store.id, name: store.name },
        },
        trial: { daysRemaining: 30, expiresAt: trialEnd.toISOString() },
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
  }
);

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email }, include: [{ model: Store }] });
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const license = await License.findOne({ where: { storeId: user.storeId } });
    const planTier = getPlanTier(license);

    const { accessToken: token, refreshToken } = signTokens(user);

    res.json({
      token, refreshToken,
      plan: planTier,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, storeId: user.storeId,
        emailVerified: user.emailVerified === 1 || user.emailVerified === true,
        store: user.Store ? { id: user.Store.id, name: user.Store.name } : null,
      },
    });
  }
);

router.get('/me', auth, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['passwordHash', 'pin'] },
    include: [{ model: Store }],
  });
  res.json(user);
});

router.put('/change-password', auth,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await User.findByPk(req.user.id);
    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  }
);

// POST /forgot-password — send SMS reset link via Twilio and/or email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const user = await User.findOne({ where: { email }, include: [{ model: Store }] });
    // Always return 200 to avoid revealing whether an email exists
    if (!user || !user.active) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );
    const appUrl = process.env.APP_URL || 'https://celltechpos.com';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    // Normalize any phone format to E.164 (+1XXXXXXXXXX) for Twilio
    function toE164(raw) {
      if (!raw) return null;
      const digits = raw.replace(/\D/g, '');
      if (digits.length === 10) return '+1' + digits;
      if (digits.length === 11 && digits[0] === '1') return '+' + digits;
      return null;
    }

    // Try SMS via Twilio first
    const storePhone = toE164(user.Store?.phone);
    if (storePhone && process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        await twilio.messages.create({
          from: process.env.TWILIO_FROM,
          to: storePhone,
          body: `CellTechPOS: Reset your password here (expires in 30 min): ${resetUrl}`,
        });
      } catch (smsErr) {
        console.warn('Forgot-password SMS failed (non-fatal):', smsErr.message);
      }
    }

    // Also send email if SMTP is configured (or if there's no store phone)
    if (!storePhone || process.env.SMTP_HOST) {
      try {
        const resetHtml = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1f2937;background:#f9fafb">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <h1 style="margin:0 0 4px 0;font-size:28px;color:#2dd4bf;letter-spacing:1px">CELLTECHPOS</h1>
    <p style="margin:0 0 24px 0;color:#6b7280;font-size:13px">Your wireless POS solution</p>
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827">Password Reset Request</h2>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px 0">
      We received a request to reset the password for your CellTechPOS account associated with this email address.
    </p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px 0">
      Click the button below to set a new password. This link expires in <strong>30 minutes</strong>.
    </p>
    <div style="text-align:center;margin:0 0 32px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#2dd4bf;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.5px">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0 0 8px 0">Or copy this link into your browser:</p>
    <p style="font-size:12px;color:#9ca3af;word-break:break-all;margin:0 0 24px 0">${resetUrl}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px 0">
    <p style="font-size:12px;color:#9ca3af;margin:0">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
  </div>
</body>
</html>`;
        await sendEmail(
          user.email,
          'CellTechPOS — Password Reset',
          resetHtml,
          `Reset your CellTechPOS password (expires in 30 min): ${resetUrl}`
        );
      } catch (emailErr) {
        console.warn('Forgot-password email failed (non-fatal):', emailErr.message);
      }
    }

    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request. Try again.' });
  }
});

// POST /reset-password — set new password using reset token
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset link has expired or is invalid. Please request a new one.' });
    }
    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Invalid reset token' });

    const user = await User.findByPk(payload.id);
    if (!user || !user.active) return res.status(404).json({ error: 'Account not found' });

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Reset failed. Please try again.' });
  }
});

// GET /verify-email?token=... — verify email address using JWT
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Verification token is required' });
  try {
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Verification link has expired or is invalid.' });
    }
    if (payload.purpose !== 'verify') return res.status(400).json({ error: 'Invalid verification token' });

    // Use raw query so missing column doesn't throw if migration hasn't run yet
    try {
      await sequelize.query(
        'UPDATE Users SET emailVerified=1, verificationToken=NULL WHERE id=?',
        { replacements: [payload.id] }
      );
    } catch (dbErr) {
      console.warn('emailVerified update failed (column may not exist yet):', dbErr.message);
    }

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /resend-verification — resend email verification link
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { include: [{ model: Store }] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Already verified' });

    const verifyToken = jwt.sign(
      { id: user.id, purpose: 'verify' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const appUrl = process.env.APP_URL || 'https://celltechpos.com';
    const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
    await sendEmail(
      user.email,
      'Verify your CellTechPOS account',
      `<p>Hi ${user.name},</p><p>Click below to verify your email address:</p><p><a href="${verifyUrl}" style="background:#2dd4bf;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block">Verify Email</a></p><p style="font-size:12px;color:#9ca3af">Link expires in 7 days.</p>`,
      `Verify your CellTechPOS email: ${verifyUrl}`
    );
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /google — sign in with Google ID token
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

    // Verify with Google's tokeninfo endpoint (no extra library required)
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await verifyRes.json();

    if (payload.error || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Audience check — ensures token was issued for our app
    if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Token audience mismatch' });
    }

    const user = await User.findOne({ where: { email: payload.email }, include: [{ model: Store }] });
    if (!user) return res.status(404).json({ error: 'No account found for this Google email. Contact your administrator.' });
    if (!user.active) return res.status(401).json({ error: 'Account is disabled' });

    const license = await License.findOne({ where: { storeId: user.storeId } });
    const planTier = getPlanTier(license);

    const { accessToken: token, refreshToken } = signTokens(user);

    res.json({
      token, refreshToken,
      plan: planTier,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, storeId: user.storeId,
        emailVerified: user.emailVerified === 1 || user.emailVerified === true,
        store: user.Store ? { id: user.Store.id, name: user.Store.name } : null,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

module.exports = router;
