require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./index');
const { Store, User, Customer, InventoryItem } = require('./models');

async function seed() {
  await sequelize.sync({ force: true });

  const store = await Store.create({
    name: 'My Wireless Store',
    address: '123 Main St',
    city: 'Houston',
    state: 'TX',
    zip: '77001',
    phone: '(713) 555-0100',
    email: 'store@mywireless.com',
    taxRate: 0.0825,
  });

  const hash = await bcrypt.hash('admin123', 10);

  await User.bulkCreate([
    { storeId: store.id, name: 'Super Admin', email: 'admin@mywireless.com', passwordHash: hash, role: 'superadmin' },
    { storeId: store.id, name: 'Store Manager', email: 'manager@mywireless.com', passwordHash: hash, role: 'admin' },
    { storeId: store.id, name: 'Tech One', email: 'tech@mywireless.com', passwordHash: hash, role: 'technician' },
    { storeId: store.id, name: 'Sales Rep', email: 'sales@mywireless.com', passwordHash: hash, role: 'sales_rep' },
  ]);

  await Customer.bulkCreate([
    { storeId: store.id, firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '(713) 555-1001' },
    { storeId: store.id, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '(713) 555-1002' },
    { storeId: store.id, firstName: 'Carlos', lastName: 'Rivera', phone: '(713) 555-1003' },
  ]);

  await InventoryItem.bulkCreate([
    { storeId: store.id, sku: 'SCR-IP14-OEM', name: 'iPhone 14 Screen (OEM)', category: 'part', brand: 'Apple', quantity: 8, minQuantity: 3, cost: 89.99, price: 149.99 },
    { storeId: store.id, sku: 'SCR-S23-OEM', name: 'Samsung S23 Screen (OEM)', category: 'part', brand: 'Samsung', quantity: 5, minQuantity: 3, cost: 79.99, price: 139.99 },
    { storeId: store.id, sku: 'BAT-IP13', name: 'iPhone 13 Battery', category: 'part', brand: 'Apple', quantity: 12, minQuantity: 5, cost: 18.99, price: 59.99 },
    { storeId: store.id, sku: 'CASE-UNIV-BLK', name: 'Universal Phone Case Black', category: 'accessory', quantity: 30, minQuantity: 10, cost: 3.99, price: 14.99 },
    { storeId: store.id, sku: 'CABLE-USBC', name: 'USB-C Cable 6ft', category: 'accessory', quantity: 25, minQuantity: 10, cost: 2.99, price: 9.99 },
    { storeId: store.id, sku: 'CHRG-65W', name: '65W Fast Charger', category: 'accessory', quantity: 15, minQuantity: 5, cost: 8.99, price: 24.99 },
    { storeId: store.id, sku: 'SVC-SCREEN', name: 'Screen Repair Service', category: 'service', quantity: 999, minQuantity: 0, cost: 0, price: 0 },
    { storeId: store.id, sku: 'SVC-DIAG', name: 'Diagnostic Fee', category: 'service', quantity: 999, minQuantity: 0, cost: 0, price: 29.99 },
  ]);

  console.log('Database seeded successfully.');
  console.log('Login: admin@mywireless.com / admin123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
