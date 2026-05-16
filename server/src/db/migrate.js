const { sequelize } = require('./index');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM pragma_table_info('${table}') WHERE name = '${column}'`
  );
  return rows[0].cnt > 0;
}

async function addColumn(table, column, definition) {
  const exists = await columnExists(table, column);
  if (!exists) {
    await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition}`);
    console.log(`  + ${table}.${column}`);
  }
}

async function runMigrations() {
  console.log('Running column migrations…');
  // Store
  await addColumn('Stores', 'loyaltyEnabled', 'TINYINT(1) DEFAULT 1');
  await addColumn('Stores', 'loyaltyPointsPerDollar', 'INTEGER DEFAULT 1');
  await addColumn('Stores', 'loyaltyPointValue', 'DECIMAL(5,4) DEFAULT 0.01');
  await addColumn('Stores', 'logoUrl', 'TEXT');
  await addColumn('Stores', 'receiptPolicy', 'TEXT');
  // User
  await addColumn('Users', 'hourlyRate', 'DECIMAL(10,2) DEFAULT 0');
  await addColumn('Users', 'commissionRate', 'DECIMAL(5,4) DEFAULT 0');
  await addColumn('Users', 'pin', 'VARCHAR(255)');
  // InventoryItem
  await addColumn('InventoryItems', 'supplierId', 'CHAR(36)');
  await addColumn('InventoryItems', 'reorderPoint', 'INTEGER DEFAULT 5');
  await addColumn('InventoryItems', 'reorderQty', 'INTEGER DEFAULT 10');
  // RepairTicket
  await addColumn('RepairTickets', 'preChecklistJson', 'TEXT');
  await addColumn('RepairTickets', 'postChecklistJson', 'TEXT');
  await addColumn('RepairTickets', 'customerSignature', 'TEXT');
  await addColumn('RepairTickets', 'signedAt', 'DATETIME');
  await addColumn('RepairTickets', 'isMailIn', 'TINYINT(1) DEFAULT 0');
  await addColumn('RepairTickets', 'inboundTracking', 'VARCHAR(255)');
  await addColumn('RepairTickets', 'outboundTracking', 'VARCHAR(255)');
  await addColumn('RepairTickets', 'shippingCarrier', 'VARCHAR(255)');
  await addColumn('RepairTickets', 'returnAddress', 'TEXT');
  await addColumn('RepairTickets', 'appointmentId', 'CHAR(36)');
  // Transaction loyalty fields
  await addColumn('Transactions', 'loyaltyPointsEarned', 'INTEGER DEFAULT 0');
  await addColumn('Transactions', 'loyaltyPointsRedeemed', 'INTEGER DEFAULT 0');
  // Refund tracking
  await addColumn('Transactions', 'originalTransactionId', 'CHAR(36)');
  await addColumn('Transactions', 'reason', 'VARCHAR(255)');
  // Store — review + tax config
  await addColumn('Stores', 'googleReviewUrl', 'VARCHAR(500)');
  await addColumn('Stores', 'taxConfigJson', 'TEXT');
  // Tip on transactions
  await addColumn('Transactions', 'tipAmount', 'DECIMAL(10,2) DEFAULT 0');

  // Stripe fields on License
  await addColumn('Licenses', 'stripeCustomerId',     'VARCHAR(255)');
  await addColumn('Licenses', 'stripeSubscriptionId', 'VARCHAR(255)');
  await addColumn('Licenses', 'stripeStatus',         'VARCHAR(50)');
  await addColumn('Licenses', 'stripePlanKey',        'VARCHAR(100)');

  // PayPal fields on License
  await addColumn('Licenses', 'paypalSubscriptionId', 'VARCHAR(255)');
  await addColumn('Licenses', 'paypalStatus',         'VARCHAR(50)');
  // PayPal plan ID on StripePlan
  await addColumn('StripePlans', 'paypalPlanId',      'VARCHAR(255)');

  // Wholesale / tiered pricing on Customer
  await addColumn('Customers', 'wholesale',  'TINYINT(1) DEFAULT 0');
  await addColumn('Customers', 'priceTier',  "VARCHAR(20) DEFAULT 'standard'");

  // Auto-create license for every store (ISO strings — no DATE type issues)
  const { License } = require('./models');
  const [stores] = await sequelize.query('SELECT id FROM `Stores`');
  for (const store of stores) {
    const existing = await License.findOne({ where: { storeId: store.id } });
    if (!existing) {
      await License.create({
        storeId: store.id, plan: 'yearly', status: 'active',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        price: 0, autoRenew: false,
      });
      console.log(`  + Created 1-year license for store ${store.id}`);
    }
  }

  console.log('Migrations done.');
}

async function seedIfEmpty() {
  const { Store, User, License } = require('./models');
  const bcrypt = require('bcryptjs');

  const count = await User.count();
  if (count > 0) return;

  console.log('Empty database detected — seeding default store and admin account...');

  const store = await Store.create({
    name: process.env.STORE_NAME || 'CellTechPOS',
    address: '123 Main St',
    city: 'Houston',
    state: 'TX',
    zip: '77001',
    phone: '(713) 555-0100',
    email: 'store@celltechpos.com',
    taxRate: 0.0825,
  });

  const hash = await bcrypt.hash('admin123', 10);
  await User.create({
    storeId: store.id,
    name: 'Admin',
    email: 'admin@celltechpos.com',
    passwordHash: hash,
    role: 'superadmin',
  });

  const existing = await License.findOne({ where: { storeId: store.id } });
  if (!existing) {
    await License.create({
      storeId: store.id,
      plan: 'yearly',
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      price: 0,
      autoRenew: false,
    });
  }

  console.log('Seed complete. Login: admin@celltechpos.com / admin123');
}

module.exports = { runMigrations, seedIfEmpty };
