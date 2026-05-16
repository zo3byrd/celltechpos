require('dotenv').config();

// ── Sentry (optional — only loads if @sentry/node is installed and SENTRY_DSN is set) ──
let Sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.2,
    });
  } catch { /* @sentry/node not installed — skip */ }
}

// ── Startup safety checks ────────────────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-long-random-secret') {
  const crypto = require('crypto');
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64');
  console.warn('WARNING: JWT_SECRET not set — generated a temporary one. Sessions will reset on each restart. Set JWT_SECRET in your environment variables.');
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { sequelize } = require('./db');
const { runMigrations, seedIfEmpty } = require('./db/migrate');
const { ensurePlans } = require('./stripe');
const { ensurePayPalPlans } = require('./paypal');
const { checkLicense } = require('./middleware/checkLicense');

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Allow auto-generated Render.com preview URLs
    if (origin.endsWith('.onrender.com')) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Stripe webhook needs raw body — must be before express.json()
app.post('/api/licenses/webhook', express.raw({ type: 'application/json' }), require('./routes/stripeWebhook'));

app.use(express.json());

// ── Rate limiting on auth ─────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
});

const repairStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts. Please try again later.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth/register', signupLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/public/repair-status', repairStatusLimiter);

// ── Public repair status lookup (no auth) ────────────────────────────────────
app.get('/api/public/repair-status/:ticketNumber', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT r.ticketNumber, r.deviceType, r.deviceBrand, r.deviceModel,
              r.issueDescription, r.status, r.estimatedCost, r.finalCost,
              r.dueDate, r.completedAt, r.createdAt, r.warrantyDays,
              s.name as storeName, s.phone as storePhone, s.email as storeEmail
       FROM RepairTickets r
       JOIN Stores s ON r.storeId = s.id
       WHERE r.ticketNumber = ? LIMIT 1`,
      { replacements: [req.params.ticketNumber] }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

app.get('/api/health', async (req, res) => {
  const start = Date.now();
  try {
    await sequelize.query('SELECT 1');
    const dbMs = Date.now() - start;
    res.json({ status: 'ok', db: 'ok', dbMs, ts: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'error', error: err.message, ts: new Date() });
  }
});

app.get('/api', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>CellTechPOS API</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:32px}
  h1{color:#4ade80;margin:0 0 4px}p{color:#94a3b8;margin:0 0 24px;font-size:14px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px}
  .card h3{margin:0 0 8px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
  .row{display:flex;align-items:center;gap-8px;padding:4px 0;border-bottom:1px solid #1e293b}
  .method{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;flex-shrink:0;width:36px;text-align:center}
  .GET{background:#166534;color:#bbf7d0}.POST{background:#1e40af;color:#bfdbfe}
  .PUT{background:#92400e;color:#fde68a}.DELETE{background:#7f1d1d;color:#fecaca}
  .path{font-family:monospace;font-size:12px;color:#7dd3fc;margin-left:8px}
  .desc{font-size:11px;color:#64748b;margin-left:auto;padding-left:8px;text-align:right}
  .badge{display:inline-block;background:#14532d;color:#86efac;font-size:11px;padding:2px 8px;border-radius:999px;margin-bottom:12px}
  .status{display:flex;align-items:center;gap:8px;margin-bottom:20px;background:#1e293b;border:1px solid #166534;border-radius:8px;padding:12px 16px}
  .dot{width:8px;height:8px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
</style></head><body>
<h1>⚡ CellTechPOS API</h1>
<p>Backend running · ${new Date().toLocaleString()}</p>
<div class="status">
  <div class="dot"></div>
  <span style="color:#4ade80;font-weight:600;font-size:13px">Server Online</span>
  <span style="color:#475569;font-size:12px;margin-left:auto">Port ${process.env.PORT || 5000} · SQLite · Node.js</span>
</div>
<div class="grid">

<div class="card"><h3>Auth</h3>
<div class="row"><span class="method POST">POST</span><span class="path">/api/auth/login</span><span class="desc">Sign in</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/auth/register</span><span class="desc">Create user</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/auth/me</span><span class="desc">Current user</span></div>
</div>

<div class="card"><h3>Repairs</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/repairs</span><span class="desc">List tickets</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/repairs</span><span class="desc">Create ticket</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/repairs/:id</span><span class="desc">Get ticket</span></div>
<div class="row"><span class="method PUT">PUT</span><span class="path">/api/repairs/:id</span><span class="desc">Update ticket</span></div>
</div>

<div class="card"><h3>Customers</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/customers</span><span class="desc">List customers</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/customers</span><span class="desc">Add customer</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/customers/:id</span><span class="desc">Get customer</span></div>
<div class="row"><span class="method PUT">PUT</span><span class="path">/api/customers/:id</span><span class="desc">Update customer</span></div>
</div>

<div class="card"><h3>Point of Sale</h3>
<div class="row"><span class="method POST">POST</span><span class="path">/api/pos/sale</span><span class="desc">Process sale</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/pos/repair-payment</span><span class="desc">Repair payment</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/pos/transactions</span><span class="desc">List transactions</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/pos/transactions/:id</span><span class="desc">Get transaction</span></div>
</div>

<div class="card"><h3>Inventory</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/inventory</span><span class="desc">List items</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/inventory</span><span class="desc">Add item</span></div>
<div class="row"><span class="method PUT">PUT</span><span class="path">/api/inventory/:id</span><span class="desc">Update item</span></div>
<div class="row"><span class="method DELETE">DELETE</span><span class="path">/api/inventory/:id</span><span class="desc">Delete item</span></div>
</div>

<div class="card"><h3>Messages</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/messages</span><span class="desc">All messages</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/messages/send</span><span class="desc">Send SMS/Email</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/messages/templates</span><span class="desc">Templates</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/messages/config/status</span><span class="desc">Config check</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/messages/customer/:id</span><span class="desc">Customer history</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/messages/repair/:id</span><span class="desc">Repair history</span></div>
</div>

<div class="card"><h3>Reports</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/reports/sales</span><span class="desc">Sales report</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/reports/repairs</span><span class="desc">Repairs report</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/reports/inventory</span><span class="desc">Inventory report</span></div>
</div>

<div class="card"><h3>Licenses (Superadmin)</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/licenses</span><span class="desc">All licenses</span></div>
<div class="row"><span class="method POST">POST</span><span class="path">/api/licenses</span><span class="desc">Create license</span></div>
<div class="row"><span class="method PUT">PUT</span><span class="path">/api/licenses/:storeId</span><span class="desc">Update license</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/licenses/my</span><span class="desc">My license</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/licenses/stats/revenue</span><span class="desc">Revenue stats</span></div>
</div>

<div class="card"><h3>Operations</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/appointments</span><span class="desc">Appointments</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/bill-payments</span><span class="desc">Bill payments</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/layaway</span><span class="desc">Layaway plans</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/purchase-orders</span><span class="desc">Purchase orders</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/suppliers</span><span class="desc">Suppliers</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/activations</span><span class="desc">Activations</span></div>
</div>

<div class="card"><h3>Staff & Growth</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/timeclock</span><span class="desc">Time entries</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/commissions</span><span class="desc">Commissions</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/loyalty</span><span class="desc">Loyalty accounts</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/campaigns</span><span class="desc">Campaigns</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/subscriptions</span><span class="desc">Subscriptions</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/inventory-counts</span><span class="desc">Inv. counts</span></div>
</div>

<div class="card"><h3>Admin</h3>
<div class="row"><span class="method GET">GET</span><span class="path">/api/admin/store</span><span class="desc">Store settings</span></div>
<div class="row"><span class="method PUT">PUT</span><span class="path">/api/admin/store</span><span class="desc">Update store</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/admin/users</span><span class="desc">All users</span></div>
<div class="row"><span class="method GET">GET</span><span class="path">/api/serials</span><span class="desc">Serial numbers</span></div>
</div>

</div>
<p style="margin-top:24px;font-size:12px;color:#334155;text-align:center">CellTechPOS · All routes require Authorization: Bearer &lt;token&gt; except /api/auth and /api/health</p>
</body></html>`);
});
app.use('/api/auth',           require('./routes/auth'));
app.post('/api/licenses/paypal-webhook', require('./routes/paypalWebhook'));
app.use('/api/licenses',       require('./routes/licenses'));

// All routes below require a valid license (superadmin is exempt inside checkLicense)
const { auth } = require('./middleware/auth');
app.use('/api', auth, checkLicense);

app.use('/api/repairs',        require('./routes/repairs'));
app.use('/api/inventory',      require('./routes/inventory'));
app.use('/api/customers',      require('./routes/customers'));
app.use('/api/pos',            require('./routes/pos'));
app.use('/api/activations',    require('./routes/activations'));
app.use('/api/commissions',    require('./routes/commissions'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/admin',          require('./routes/admin'));
app.use('/api/appointments',   require('./routes/appointments'));
app.use('/api/suppliers',      require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchase-orders'));
app.use('/api/serials',        require('./routes/serials'));
app.use('/api/timeclock',      require('./routes/timeclock'));
app.use('/api/loyalty',        require('./routes/loyalty'));
app.use('/api/campaigns',      require('./routes/campaigns'));
app.use('/api/bill-payments',  require('./routes/bill-payments'));
app.use('/api/layaway',        require('./routes/layaway'));
app.use('/api/inventory-counts', require('./routes/inventory-counts'));
app.use('/api/subscriptions',  require('./routes/subscriptions'));
app.use('/api/messages',       require('./routes/messages'));
app.use('/api/admin-campaigns', require('./routes/admin-campaigns'));
app.use('/api/settings',       require('./routes/settings'));
app.use('/api/announcements',  require('./routes/announcements'));
app.use('/api/contact',        require('./routes/contact'));
app.use('/api/buyback',        require('./routes/buyback'));
app.use('/api/estimates',      require('./routes/estimates'));
app.use('/api/recurring',      require('./routes/recurring-invoices'));
app.use('/api/uploads',        require('./routes/uploads'));

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')));

// Public display board (no auth)
app.use('/api/display',        require('./routes/display'));

// ── Serve React build in production ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const clientDist = path.join(__dirname, '../../client/dist');
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(indexHtml));
  } else {
    console.warn('WARNING: client/dist/index.html not found — frontend not available. API-only mode.');
    app.get('*', (req, res) => res.status(503).json({ error: 'Frontend not built. Run npm run build first.' }));
  }
}

if (Sentry) Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

sequelize
  .sync()
  .then(() => runMigrations())
  .then(() => seedIfEmpty())
  .then(() => ensurePlans(sequelize))
  .then(() => ensurePayPalPlans(sequelize))
  .then(() => app.listen(PORT, () => console.log(`API ready → http://localhost:${PORT}/api`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
