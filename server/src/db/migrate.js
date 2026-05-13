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

module.exports = { runMigrations };
