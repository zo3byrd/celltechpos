const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    // Demo sessions are read-only — block all writes
    if (req.user.role === 'demo' && req.method !== 'GET') {
      return res.status(403).json({ error: 'Demo mode — sign up free to save changes', demo: true });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

const authenticate = auth;
const requireAdmin = requireRole('superadmin', 'admin');

module.exports = { auth, requireRole, authenticate, requireAdmin };
