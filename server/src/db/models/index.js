const { sequelize } = require('../index');
const { DataTypes } = require('sequelize');

// ── Store ─────────────────────────────────────────────────────────────────────
const Store = sequelize.define('Store', {
  id:      { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:    { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING },
  city:    { type: DataTypes.STRING },
  state:   { type: DataTypes.STRING },
  zip:     { type: DataTypes.STRING },
  phone:   { type: DataTypes.STRING },
  email:   { type: DataTypes.STRING },
  taxRate: { type: DataTypes.DECIMAL(5, 4), defaultValue: 0.0825 },
  active:  { type: DataTypes.BOOLEAN, defaultValue: true },
  loyaltyEnabled:      { type: DataTypes.BOOLEAN, defaultValue: true },
  loyaltyPointsPerDollar: { type: DataTypes.INTEGER, defaultValue: 1 },
  loyaltyPointValue:   { type: DataTypes.DECIMAL(5, 4), defaultValue: 0.01 },
});

// ── User ──────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:      { type: DataTypes.UUID },
  name:         { type: DataTypes.STRING, allowNull: false },
  email:        { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role:         { type: DataTypes.ENUM('superadmin', 'admin', 'technician', 'sales_rep', 'cashier'), defaultValue: 'cashier' },
  active:       { type: DataTypes.BOOLEAN, defaultValue: true },
  pin:          { type: DataTypes.STRING },
  hourlyRate:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  commissionRate: { type: DataTypes.DECIMAL(5, 4), defaultValue: 0 },
});

// ── Customer ──────────────────────────────────────────────────────────────────
const Customer = sequelize.define('Customer', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:   { type: DataTypes.UUID },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName:  { type: DataTypes.STRING, allowNull: false },
  email:     { type: DataTypes.STRING },
  phone:     { type: DataTypes.STRING },
  address:   { type: DataTypes.STRING },
  city:      { type: DataTypes.STRING },
  state:     { type: DataTypes.STRING },
  zip:       { type: DataTypes.STRING },
  notes:     { type: DataTypes.TEXT },
  idType:    { type: DataTypes.STRING },
  idNumber:  { type: DataTypes.STRING },
});

// ── InventoryItem ─────────────────────────────────────────────────────────────
const InventoryItem = sequelize.define('InventoryItem', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:          { type: DataTypes.UUID },
  sku:              { type: DataTypes.STRING },
  barcode:          { type: DataTypes.STRING },
  name:             { type: DataTypes.STRING, allowNull: false },
  description:      { type: DataTypes.TEXT },
  category:         { type: DataTypes.ENUM('part', 'accessory', 'device', 'plan', 'service', 'other'), defaultValue: 'accessory' },
  brand:            { type: DataTypes.STRING },
  modelCompatibility: { type: DataTypes.STRING },
  quantity:         { type: DataTypes.INTEGER, defaultValue: 0 },
  minQuantity:      { type: DataTypes.INTEGER, defaultValue: 5 },
  reorderPoint:     { type: DataTypes.INTEGER, defaultValue: 5 },
  reorderQty:       { type: DataTypes.INTEGER, defaultValue: 10 },
  cost:             { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  price:            { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  serialTracked:    { type: DataTypes.BOOLEAN, defaultValue: false },
  active:           { type: DataTypes.BOOLEAN, defaultValue: true },
  imageUrl:         { type: DataTypes.STRING(500) },
  supplierId:       { type: DataTypes.UUID, allowNull: true },
});

// ── RepairTicket ──────────────────────────────────────────────────────────────
const RepairTicket = sequelize.define('RepairTicket', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketNumber:   { type: DataTypes.STRING, unique: true },
  storeId:        { type: DataTypes.UUID },
  customerId:     { type: DataTypes.UUID },
  technicianId:   { type: DataTypes.UUID, allowNull: true },
  deviceType:     { type: DataTypes.ENUM('phone', 'tablet', 'laptop', 'watch', 'other'), defaultValue: 'phone' },
  deviceBrand:    { type: DataTypes.STRING },
  deviceModel:    { type: DataTypes.STRING },
  imei:           { type: DataTypes.STRING },
  passcode:       { type: DataTypes.STRING },
  color:          { type: DataTypes.STRING },
  issueDescription: { type: DataTypes.TEXT },
  diagnosis:      { type: DataTypes.TEXT },
  status:         { type: DataTypes.ENUM('received', 'diagnosing', 'waiting_parts', 'in_repair', 'quality_check', 'ready', 'picked_up', 'cancelled'), defaultValue: 'received' },
  priority:       { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  estimatedCost:  { type: DataTypes.DECIMAL(10, 2) },
  finalCost:      { type: DataTypes.DECIMAL(10, 2) },
  deposit:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  completedAt:    { type: DataTypes.DATE },
  dueDate:        { type: DataTypes.DATE },
  warrantyDays:   { type: DataTypes.INTEGER, defaultValue: 90 },
  notes:          { type: DataTypes.TEXT },
  internalNotes:  { type: DataTypes.TEXT },
  preChecklistJson:  { type: DataTypes.TEXT },
  postChecklistJson: { type: DataTypes.TEXT },
  customerSignature: { type: DataTypes.TEXT },
  signedAt:       { type: DataTypes.DATE },
  isMailIn:       { type: DataTypes.BOOLEAN, defaultValue: false },
  inboundTracking: { type: DataTypes.STRING },
  outboundTracking: { type: DataTypes.STRING },
  shippingCarrier: { type: DataTypes.STRING },
  returnAddress:  { type: DataTypes.TEXT },
  appointmentId:  { type: DataTypes.UUID, allowNull: true },
});

// ── RepairPart ────────────────────────────────────────────────────────────────
const RepairPart = sequelize.define('RepairPart', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  repairId:  { type: DataTypes.UUID },
  itemId:    { type: DataTypes.UUID },
  quantity:  { type: DataTypes.INTEGER, defaultValue: 1 },
  unitCost:  { type: DataTypes.DECIMAL(10, 2) },
  unitPrice: { type: DataTypes.DECIMAL(10, 2) },
});

// ── Transaction ───────────────────────────────────────────────────────────────
const Transaction = sequelize.define('Transaction', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transactionNumber: { type: DataTypes.STRING, unique: true },
  storeId:           { type: DataTypes.UUID },
  customerId:        { type: DataTypes.UUID, allowNull: true },
  userId:            { type: DataTypes.UUID },
  repairId:          { type: DataTypes.UUID, allowNull: true },
  type:              { type: DataTypes.ENUM('sale', 'refund', 'repair_payment', 'deposit', 'layaway_payment', 'bill_payment'), defaultValue: 'sale' },
  subtotal:          { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  taxAmount:         { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discountAmount:    { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total:             { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  paymentMethod:     { type: DataTypes.ENUM('cash', 'card', 'epay', 'vidapay', 'webpos', 'check', 'split'), defaultValue: 'cash' },
  paymentStatus:     { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'completed' },
  referenceNumber:   { type: DataTypes.STRING },
  notes:             { type: DataTypes.TEXT },
  loyaltyPointsEarned:   { type: DataTypes.INTEGER, defaultValue: 0 },
  loyaltyPointsRedeemed: { type: DataTypes.INTEGER, defaultValue: 0 },
});

// ── TransactionItem ───────────────────────────────────────────────────────────
const TransactionItem = sequelize.define('TransactionItem', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transactionId: { type: DataTypes.UUID },
  itemId:        { type: DataTypes.UUID, allowNull: true },
  name:          { type: DataTypes.STRING },
  quantity:      { type: DataTypes.INTEGER, defaultValue: 1 },
  unitPrice:     { type: DataTypes.DECIMAL(10, 2) },
  discount:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total:         { type: DataTypes.DECIMAL(10, 2) },
});

// ── Activation ────────────────────────────────────────────────────────────────
const Activation = sequelize.define('Activation', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  activationNumber: { type: DataTypes.STRING, unique: true },
  storeId:          { type: DataTypes.UUID },
  customerId:       { type: DataTypes.UUID },
  salesRepId:       { type: DataTypes.UUID },
  carrier:          { type: DataTypes.ENUM('boost', 'tmobile', 'att', 'verizon', 'metro', 'cricket', 'visible', 'other'), defaultValue: 'boost' },
  activationType:   { type: DataTypes.ENUM('new', 'upgrade', 'port', 'plan_change', 'swap'), defaultValue: 'new' },
  planName:         { type: DataTypes.STRING },
  planCost:         { type: DataTypes.DECIMAL(10, 2) },
  phoneNumber:      { type: DataTypes.STRING },
  imei:             { type: DataTypes.STRING },
  simNumber:        { type: DataTypes.STRING },
  status:           { type: DataTypes.ENUM('pending', 'submitted', 'approved', 'rejected', 'cancelled'), defaultValue: 'pending' },
  commissionAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  spiffAmount:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  epayRef:          { type: DataTypes.STRING },
  vidapayRef:       { type: DataTypes.STRING },
  notes:            { type: DataTypes.TEXT },
});

// ── Commission ────────────────────────────────────────────────────────────────
const Commission = sequelize.define('Commission', {
  id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:               { type: DataTypes.UUID },
  storeId:              { type: DataTypes.UUID },
  periodStart:          { type: DataTypes.DATEONLY },
  periodEnd:            { type: DataTypes.DATEONLY },
  activationCommission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  repairCommission:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  salesCommission:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  spiffTotal:           { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total:                { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status:               { type: DataTypes.ENUM('pending', 'approved', 'paid'), defaultValue: 'pending' },
  notes:                { type: DataTypes.TEXT },
});

// ── Appointment ───────────────────────────────────────────────────────────────
const Appointment = sequelize.define('Appointment', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:      { type: DataTypes.UUID },
  customerId:   { type: DataTypes.UUID, allowNull: true },
  technicianId: { type: DataTypes.UUID, allowNull: true },
  title:        { type: DataTypes.STRING, allowNull: false },
  notes:        { type: DataTypes.TEXT },
  scheduledAt:  { type: DataTypes.DATE, allowNull: false },
  duration:     { type: DataTypes.INTEGER, defaultValue: 60 },
  status:       { type: DataTypes.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'), defaultValue: 'scheduled' },
  deviceType:   { type: DataTypes.STRING },
  deviceBrand:  { type: DataTypes.STRING },
  deviceModel:  { type: DataTypes.STRING },
  issueDescription: { type: DataTypes.TEXT },
  source:       { type: DataTypes.ENUM('walk_in', 'phone', 'online', 'other'), defaultValue: 'phone' },
  reminderSent: { type: DataTypes.BOOLEAN, defaultValue: false },
  customerName: { type: DataTypes.STRING },
  customerPhone: { type: DataTypes.STRING },
  customerEmail: { type: DataTypes.STRING },
});

// ── Supplier ──────────────────────────────────────────────────────────────────
const Supplier = sequelize.define('Supplier', {
  id:      { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId: { type: DataTypes.UUID },
  name:    { type: DataTypes.STRING, allowNull: false },
  contact: { type: DataTypes.STRING },
  email:   { type: DataTypes.STRING },
  phone:   { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  website: { type: DataTypes.STRING },
  notes:   { type: DataTypes.TEXT },
  active:  { type: DataTypes.BOOLEAN, defaultValue: true },
  accountNumber: { type: DataTypes.STRING },
  paymentTerms:  { type: DataTypes.STRING },
});

// ── PurchaseOrder ─────────────────────────────────────────────────────────────
const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  poNumber:    { type: DataTypes.STRING, unique: true },
  storeId:     { type: DataTypes.UUID },
  supplierId:  { type: DataTypes.UUID, allowNull: true },
  userId:      { type: DataTypes.UUID },
  status:      { type: DataTypes.ENUM('draft', 'ordered', 'partial', 'received', 'cancelled'), defaultValue: 'draft' },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  orderedAt:   { type: DataTypes.DATE },
  expectedAt:  { type: DataTypes.DATE },
  receivedAt:  { type: DataTypes.DATE },
  notes:       { type: DataTypes.TEXT },
  shippingCost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
});

// ── PurchaseOrderItem ─────────────────────────────────────────────────────────
const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  poId:        { type: DataTypes.UUID },
  itemId:      { type: DataTypes.UUID, allowNull: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  sku:         { type: DataTypes.STRING },
  orderedQty:  { type: DataTypes.INTEGER, defaultValue: 1 },
  receivedQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  unitCost:    { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  totalCost:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
});

// ── SerialNumber ──────────────────────────────────────────────────────────────
const SerialNumber = sequelize.define('SerialNumber', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:       { type: DataTypes.UUID },
  itemId:        { type: DataTypes.UUID },
  serial:        { type: DataTypes.STRING, allowNull: false },
  imei:          { type: DataTypes.STRING },
  status:        { type: DataTypes.ENUM('in_stock', 'sold', 'returned', 'defective'), defaultValue: 'in_stock' },
  soldAt:        { type: DataTypes.DATE },
  customerId:    { type: DataTypes.UUID, allowNull: true },
  transactionId: { type: DataTypes.UUID, allowNull: true },
  notes:         { type: DataTypes.TEXT },
});

// ── TimeEntry ─────────────────────────────────────────────────────────────────
const TimeEntry = sequelize.define('TimeEntry', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:     { type: DataTypes.UUID },
  storeId:    { type: DataTypes.UUID },
  clockIn:    { type: DataTypes.DATE, allowNull: false },
  clockOut:   { type: DataTypes.DATE },
  breakMins:  { type: DataTypes.INTEGER, defaultValue: 0 },
  totalMins:  { type: DataTypes.INTEGER },
  hourlyRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  earnings:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  notes:      { type: DataTypes.TEXT },
  status:     { type: DataTypes.ENUM('active', 'completed', 'adjusted'), defaultValue: 'active' },
});

// ── LoyaltyAccount ────────────────────────────────────────────────────────────
const LoyaltyAccount = sequelize.define('LoyaltyAccount', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  customerId:     { type: DataTypes.UUID, unique: true },
  storeId:        { type: DataTypes.UUID },
  points:         { type: DataTypes.INTEGER, defaultValue: 0 },
  lifetimePoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  tier:           { type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'), defaultValue: 'bronze' },
  active:         { type: DataTypes.BOOLEAN, defaultValue: true },
});

// ── LoyaltyTransaction ────────────────────────────────────────────────────────
const LoyaltyTransaction = sequelize.define('LoyaltyTransaction', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  accountId:   { type: DataTypes.UUID },
  type:        { type: DataTypes.ENUM('earn', 'redeem', 'adjust', 'expire'), defaultValue: 'earn' },
  points:      { type: DataTypes.INTEGER },
  balance:     { type: DataTypes.INTEGER },
  referenceId: { type: DataTypes.UUID, allowNull: true },
  description: { type: DataTypes.STRING },
});

// ── LayawayPlan ───────────────────────────────────────────────────────────────
const LayawayPlan = sequelize.define('LayawayPlan', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  layawayNumber:   { type: DataTypes.STRING, unique: true },
  storeId:         { type: DataTypes.UUID },
  customerId:      { type: DataTypes.UUID },
  userId:          { type: DataTypes.UUID },
  totalAmount:     { type: DataTypes.DECIMAL(10, 2) },
  paidAmount:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  depositAmount:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  dueDate:         { type: DataTypes.DATE },
  status:          { type: DataTypes.ENUM('active', 'completed', 'cancelled', 'forfeited'), defaultValue: 'active' },
  notes:           { type: DataTypes.TEXT },
  itemsJson:       { type: DataTypes.TEXT },
});

// ── LayawayPayment ────────────────────────────────────────────────────────────
const LayawayPayment = sequelize.define('LayawayPayment', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  layawayId:     { type: DataTypes.UUID },
  amount:        { type: DataTypes.DECIMAL(10, 2) },
  paymentMethod: { type: DataTypes.ENUM('cash', 'card', 'check', 'other'), defaultValue: 'cash' },
  notes:         { type: DataTypes.TEXT },
});

// ── Campaign ──────────────────────────────────────────────────────────────────
const Campaign = sequelize.define('Campaign', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:        { type: DataTypes.UUID },
  userId:         { type: DataTypes.UUID },
  name:           { type: DataTypes.STRING, allowNull: false },
  type:           { type: DataTypes.ENUM('email', 'sms'), defaultValue: 'email' },
  subject:        { type: DataTypes.STRING },
  message:        { type: DataTypes.TEXT },
  target:         { type: DataTypes.ENUM('all', 'has_repairs', 'loyalty_members', 'inactive_90days'), defaultValue: 'all' },
  status:         { type: DataTypes.ENUM('draft', 'scheduled', 'sent', 'cancelled'), defaultValue: 'draft' },
  sentAt:         { type: DataTypes.DATE },
  scheduledAt:    { type: DataTypes.DATE },
  recipientCount: { type: DataTypes.INTEGER, defaultValue: 0 },
});

// ── BillPayment ───────────────────────────────────────────────────────────────
const BillPayment = sequelize.define('BillPayment', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  billNumber:    { type: DataTypes.STRING, unique: true },
  storeId:       { type: DataTypes.UUID },
  customerId:    { type: DataTypes.UUID, allowNull: true },
  userId:        { type: DataTypes.UUID },
  type:          { type: DataTypes.ENUM('prepaid_pin', 'bill_payment', 'mobile_topup', 'money_order'), defaultValue: 'prepaid_pin' },
  carrier:       { type: DataTypes.STRING },
  amount:        { type: DataTypes.DECIMAL(10, 2) },
  fee:           { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total:         { type: DataTypes.DECIMAL(10, 2) },
  phoneNumber:   { type: DataTypes.STRING },
  pinCode:       { type: DataTypes.STRING },
  accountNumber: { type: DataTypes.STRING },
  paymentMethod: { type: DataTypes.ENUM('cash', 'card', 'check', 'other'), defaultValue: 'cash' },
  status:        { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'completed' },
  provider:      { type: DataTypes.ENUM('epay', 'vidapay', 'manual', 'other'), defaultValue: 'manual' },
  providerRef:   { type: DataTypes.STRING },
  notes:         { type: DataTypes.TEXT },
});

// ── SubscriptionPlan ──────────────────────────────────────────────────────────
const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:     { type: DataTypes.UUID },
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  interval:    { type: DataTypes.ENUM('weekly', 'monthly', 'yearly'), defaultValue: 'monthly' },
  features:    { type: DataTypes.TEXT },
  active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  color:       { type: DataTypes.STRING, defaultValue: '#0284c7' },
});

// ── Subscription ──────────────────────────────────────────────────────────────
const Subscription = sequelize.define('Subscription', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:         { type: DataTypes.UUID },
  customerId:      { type: DataTypes.UUID },
  planId:          { type: DataTypes.UUID },
  userId:          { type: DataTypes.UUID },
  status:          { type: DataTypes.ENUM('active', 'paused', 'cancelled', 'expired'), defaultValue: 'active' },
  price:           { type: DataTypes.DECIMAL(10, 2) },
  startDate:       { type: DataTypes.DATE },
  nextBillingDate: { type: DataTypes.DATE },
  lastBilledDate:  { type: DataTypes.DATE },
  cancelledAt:     { type: DataTypes.DATE },
  cancelReason:    { type: DataTypes.TEXT },
  paymentMethod:   { type: DataTypes.STRING },
  renewalCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
  notes:           { type: DataTypes.TEXT },
});

// ── Message ───────────────────────────────────────────────────────────────────
const Message = sequelize.define('Message', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:     { type: DataTypes.UUID },
  customerId:  { type: DataTypes.UUID, allowNull: true },
  repairId:    { type: DataTypes.UUID, allowNull: true },
  userId:      { type: DataTypes.UUID },
  type:        { type: DataTypes.ENUM('sms', 'email'), allowNull: false },
  to:          { type: DataTypes.STRING },        // phone or email
  subject:     { type: DataTypes.STRING },        // email only
  body:        { type: DataTypes.TEXT },
  status:      { type: DataTypes.ENUM('sent', 'failed', 'pending'), defaultValue: 'pending' },
  error:       { type: DataTypes.TEXT },
  providerRef: { type: DataTypes.STRING },
});

// ── License ───────────────────────────────────────────────────────────────────
// Date fields stored as ISO strings (avoids Sequelize/SQLite DATE parsing issues)
const License = sequelize.define('License', {
  id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:              { type: DataTypes.UUID, unique: true },
  plan:                 { type: DataTypes.ENUM('trial', 'monthly', 'yearly'), defaultValue: 'trial' },
  status:               { type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled'), defaultValue: 'active' },
  startedAt:            { type: DataTypes.STRING },
  expiresAt:            { type: DataTypes.STRING },
  price:                { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  lastPaidAt:           { type: DataTypes.STRING },
  autoRenew:            { type: DataTypes.BOOLEAN, defaultValue: false },
  notes:                { type: DataTypes.TEXT },
  stripeCustomerId:     { type: DataTypes.STRING },
  stripeSubscriptionId: { type: DataTypes.STRING },
  stripeStatus:         { type: DataTypes.STRING },
  stripePlanKey:        { type: DataTypes.STRING },
});

// ── StripePlan ────────────────────────────────────────────────────────────────
const StripePlan = sequelize.define('StripePlan', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key:             { type: DataTypes.STRING, unique: true, allowNull: false },
  label:           { type: DataTypes.STRING, allowNull: false },
  amount:          { type: DataTypes.INTEGER, allowNull: false },
  interval:        { type: DataTypes.ENUM('month', 'year'), defaultValue: 'month' },
  stripePriceId:   { type: DataTypes.STRING },
  stripeProductId: { type: DataTypes.STRING },
  active:          { type: DataTypes.BOOLEAN, defaultValue: true },
});

// ── InventoryCount ────────────────────────────────────────────────────────────
const InventoryCount = sequelize.define('InventoryCount', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:   { type: DataTypes.UUID },
  userId:    { type: DataTypes.UUID },
  name:      { type: DataTypes.STRING, allowNull: false },
  status:    { type: DataTypes.ENUM('in_progress', 'completed', 'cancelled'), defaultValue: 'in_progress' },
  notes:     { type: DataTypes.TEXT },
  completedAt: { type: DataTypes.DATE },
});

// ── InventoryCountItem ────────────────────────────────────────────────────────
const InventoryCountItem = sequelize.define('InventoryCountItem', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  countId:       { type: DataTypes.UUID },
  itemId:        { type: DataTypes.UUID },
  expectedQty:   { type: DataTypes.INTEGER, defaultValue: 0 },
  countedQty:    { type: DataTypes.INTEGER },
  variance:      { type: DataTypes.INTEGER },
  notes:         { type: DataTypes.TEXT },
});

// ── Associations ──────────────────────────────────────────────────────────────
Store.hasMany(User,          { foreignKey: 'storeId' });
User.belongsTo(Store,        { foreignKey: 'storeId' });

Store.hasMany(Customer,      { foreignKey: 'storeId' });
Customer.belongsTo(Store,    { foreignKey: 'storeId' });

Store.hasMany(InventoryItem, { foreignKey: 'storeId' });
InventoryItem.belongsTo(Store, { foreignKey: 'storeId' });

Store.hasMany(RepairTicket,  { foreignKey: 'storeId' });
RepairTicket.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(RepairTicket, { foreignKey: 'customerId' });
RepairTicket.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(RepairTicket,   { foreignKey: 'technicianId', as: 'repairs' });
RepairTicket.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

RepairTicket.hasMany(RepairPart, { foreignKey: 'repairId' });
RepairPart.belongsTo(RepairTicket, { foreignKey: 'repairId' });
InventoryItem.hasMany(RepairPart, { foreignKey: 'itemId' });
RepairPart.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

Store.hasMany(Transaction,   { foreignKey: 'storeId' });
Transaction.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(Transaction, { foreignKey: 'customerId' });
Transaction.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Transaction,    { foreignKey: 'userId' });
Transaction.belongsTo(User,  { foreignKey: 'userId' });
RepairTicket.hasMany(Transaction, { foreignKey: 'repairId' });
Transaction.belongsTo(RepairTicket, { foreignKey: 'repairId' });

Transaction.hasMany(TransactionItem, { foreignKey: 'transactionId' });
TransactionItem.belongsTo(Transaction, { foreignKey: 'transactionId' });
InventoryItem.hasMany(TransactionItem, { foreignKey: 'itemId' });
TransactionItem.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

Store.hasMany(Activation,    { foreignKey: 'storeId' });
Activation.belongsTo(Store,  { foreignKey: 'storeId' });
Customer.hasMany(Activation, { foreignKey: 'customerId' });
Activation.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Activation,     { foreignKey: 'salesRepId', as: 'activations' });
Activation.belongsTo(User,   { foreignKey: 'salesRepId', as: 'salesRep' });

User.hasMany(Commission,     { foreignKey: 'userId' });
Commission.belongsTo(User,   { foreignKey: 'userId' });
Store.hasMany(Commission,    { foreignKey: 'storeId' });
Commission.belongsTo(Store,  { foreignKey: 'storeId' });

Store.hasMany(Appointment,   { foreignKey: 'storeId' });
Appointment.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(Appointment, { foreignKey: 'customerId' });
Appointment.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Appointment,    { foreignKey: 'technicianId', as: 'appointments' });
Appointment.belongsTo(User,  { foreignKey: 'technicianId', as: 'technician' });

Store.hasMany(Supplier,      { foreignKey: 'storeId' });
Supplier.belongsTo(Store,    { foreignKey: 'storeId' });
Supplier.hasMany(InventoryItem, { foreignKey: 'supplierId' });
InventoryItem.belongsTo(Supplier, { foreignKey: 'supplierId' });

Store.hasMany(PurchaseOrder, { foreignKey: 'storeId' });
PurchaseOrder.belongsTo(Store, { foreignKey: 'storeId' });
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });
User.hasMany(PurchaseOrder,  { foreignKey: 'userId' });
PurchaseOrder.belongsTo(User, { foreignKey: 'userId' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'poId', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'poId' });
InventoryItem.hasMany(PurchaseOrderItem, { foreignKey: 'itemId' });
PurchaseOrderItem.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

Store.hasMany(SerialNumber,  { foreignKey: 'storeId' });
SerialNumber.belongsTo(Store, { foreignKey: 'storeId' });
InventoryItem.hasMany(SerialNumber, { foreignKey: 'itemId' });
SerialNumber.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

Store.hasMany(TimeEntry,     { foreignKey: 'storeId' });
TimeEntry.belongsTo(Store,   { foreignKey: 'storeId' });
User.hasMany(TimeEntry,      { foreignKey: 'userId' });
TimeEntry.belongsTo(User,    { foreignKey: 'userId' });

LoyaltyAccount.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasOne(LoyaltyAccount,    { foreignKey: 'customerId' });
LoyaltyAccount.hasMany(LoyaltyTransaction, { foreignKey: 'accountId', as: 'transactions' });
LoyaltyTransaction.belongsTo(LoyaltyAccount, { foreignKey: 'accountId' });

Store.hasMany(LayawayPlan,   { foreignKey: 'storeId' });
LayawayPlan.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(LayawayPlan, { foreignKey: 'customerId' });
LayawayPlan.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(LayawayPlan,    { foreignKey: 'userId' });
LayawayPlan.belongsTo(User,  { foreignKey: 'userId' });
LayawayPlan.hasMany(LayawayPayment, { foreignKey: 'layawayId', as: 'payments' });
LayawayPayment.belongsTo(LayawayPlan, { foreignKey: 'layawayId' });

Store.hasMany(Campaign,      { foreignKey: 'storeId' });
Campaign.belongsTo(Store,    { foreignKey: 'storeId' });
User.hasMany(Campaign,       { foreignKey: 'userId' });
Campaign.belongsTo(User,     { foreignKey: 'userId' });

Store.hasMany(BillPayment,   { foreignKey: 'storeId' });
BillPayment.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(BillPayment, { foreignKey: 'customerId' });
BillPayment.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(BillPayment,    { foreignKey: 'userId' });
BillPayment.belongsTo(User,  { foreignKey: 'userId' });

Store.hasMany(SubscriptionPlan, { foreignKey: 'storeId' });
SubscriptionPlan.belongsTo(Store, { foreignKey: 'storeId' });
SubscriptionPlan.hasMany(Subscription, { foreignKey: 'planId' });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'planId' });
Store.hasMany(Subscription,  { foreignKey: 'storeId' });
Subscription.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(Subscription, { foreignKey: 'customerId' });
Subscription.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Subscription,   { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

Store.hasMany(Message,   { foreignKey: 'storeId' });
Message.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(Message, { foreignKey: 'customerId' });
Message.belongsTo(Customer, { foreignKey: 'customerId' });
RepairTicket.hasMany(Message, { foreignKey: 'repairId' });
Message.belongsTo(RepairTicket, { foreignKey: 'repairId' });
User.hasMany(Message,    { foreignKey: 'userId' });
Message.belongsTo(User,  { foreignKey: 'userId' });

License.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasOne(License, { foreignKey: 'storeId' });

Store.hasMany(InventoryCount, { foreignKey: 'storeId' });
InventoryCount.belongsTo(Store, { foreignKey: 'storeId' });
User.hasMany(InventoryCount,  { foreignKey: 'userId' });
InventoryCount.belongsTo(User, { foreignKey: 'userId' });
InventoryCount.hasMany(InventoryCountItem, { foreignKey: 'countId', as: 'countItems' });
InventoryCountItem.belongsTo(InventoryCount, { foreignKey: 'countId' });
InventoryItem.hasMany(InventoryCountItem, { foreignKey: 'itemId' });
InventoryCountItem.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

module.exports = {
  Store, User, Customer, InventoryItem, License, StripePlan, Message,
  RepairTicket, RepairPart,
  Transaction, TransactionItem,
  Activation, Commission,
  Appointment,
  Supplier, PurchaseOrder, PurchaseOrderItem,
  SerialNumber,
  TimeEntry,
  LoyaltyAccount, LoyaltyTransaction,
  LayawayPlan, LayawayPayment,
  Campaign,
  BillPayment,
  InventoryCount, InventoryCountItem,
  SubscriptionPlan, Subscription,
};
