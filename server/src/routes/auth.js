const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, Store } = require('../db/models');
const { auth } = require('../middleware/auth');

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

    const token = jwt.sign(
      { id: user.id, role: user.role, storeId: user.storeId, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, storeId: user.storeId,
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

module.exports = router;
