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
  logoUrl:             { type: DataTypes.TEXT },
  receiptPolicy:       { type: DataTypes.TEXT },
  googleReviewUrl:     { type: DataTypes.STRING(500) },
  taxConfigJson:       { type: DataTypes.TEXT },
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
  wholesale:  { type: DataTypes.BOOLEAN, defaultValue: false },
  priceTier:  { type: DataTypes.ENUM('standard', 'wholesale', 'vip'), defaultValue: 'standard' },
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
  paymentMethod:     { type: DataTypes.ENUM('cash', 'card', 'epay', 'vidapay', 'webpos', 'check', 'split', 'gift_card', 'stripe'), defaultValue: 'cash' },
  paymentStatus:     { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'completed' },
  referenceNumber:   { type: DataTypes.STRING },
  notes:             { type: DataTypes.TEXT },
  loyaltyPointsEarned:   { type: DataTypes.INTEGER, defaultValue: 0 },
  loyaltyPointsRedeemed: { type: DataTypes.INTEGER, defaultValue: 0 },
  originalTransactionId: { type: DataTypes.UUID, allowNull: true },
  reason:                { type: DataTypes.STRING, allowNull: true },
  tipAmount:             { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
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

// ── AdminCampaign ─────────────────────────────────────────────────────────────
const AdminCampaign = sequelize.define('AdminCampaign', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subject:        { type: DataTypes.STRING, allowNull: false },
  fromName:       { type: DataTypes.STRING, defaultValue: 'CellTechPOS' },
  body:           { type: DataTypes.TEXT, allowNull: false },
  target:         { type: DataTypes.ENUM('all','active','expiring_30','expired','monthly','yearly','trial'), defaultValue: 'all' },
  status:         { type: DataTypes.ENUM('draft','sending','sent','failed'), defaultValue: 'draft' },
  sentAt:         { type: DataTypes.DATE },
  recipientCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  successCount:   { type: DataTypes.INTEGER, defaultValue: 0 },
  failCount:      { type: DataTypes.INTEGER, defaultValue: 0 },
  sentBy:         { type: DataTypes.UUID, allowNull: true },
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
  paypalSubscriptionId: { type: DataTypes.STRING },
  paypalStatus:         { type: DataTypes.STRING },
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
  paypalPlanId:    { type: DataTypes.STRING },
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

// ── Setting ───────────────────────────────────────────────────────────────────
const Setting = sequelize.define('Setting', {
  key:   { type: DataTypes.STRING, unique: true, allowNull: false },
  value: { type: DataTypes.TEXT },
});

// ── Announcement ──────────────────────────────────────────────────────────────
const Announcement = sequelize.define('Announcement', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:     { type: DataTypes.STRING, allowNull: false },
  body:      { type: DataTypes.TEXT },
  type:      { type: DataTypes.ENUM('info', 'success', 'warning', 'error'), defaultValue: 'info' },
  active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  dismissible: { type: DataTypes.BOOLEAN, defaultValue: true },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
});

// ── StoreNote ─────────────────────────────────────────────────────────────────
const StoreNote = sequelize.define('StoreNote', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:   { type: DataTypes.UUID, allowNull: false },
  note:      { type: DataTypes.TEXT, allowNull: false },
  createdBy: { type: DataTypes.UUID },
});

// ── RecurringInvoice ──────────────────────────────────────────────────────────
const RecurringInvoice = sequelize.define('RecurringInvoice', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:         { type: DataTypes.UUID, allowNull: false },
  customerId:      { type: DataTypes.UUID, allowNull: true },
  userId:          { type: DataTypes.UUID },
  name:            { type: DataTypes.STRING, allowNull: false },
  lineItemsJson:   { type: DataTypes.TEXT, defaultValue: '[]' },
  subtotal:        { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  taxRate:         { type: DataTypes.DECIMAL(5,4), defaultValue: 0 },
  taxAmount:       { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total:           { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  frequency:       { type: DataTypes.ENUM('weekly','monthly','quarterly','yearly'), defaultValue: 'monthly' },
  startDate:       { type: DataTypes.DATEONLY },
  nextBillingDate: { type: DataTypes.DATEONLY },
  lastBilledDate:  { type: DataTypes.DATEONLY },
  status:          { type: DataTypes.ENUM('active','paused','cancelled'), defaultValue: 'active' },
  billingCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
  notes:           { type: DataTypes.TEXT },
  dueDays:         { type: DataTypes.INTEGER, defaultValue: 30 },
});

// ── Invoice ───────────────────────────────────────────────────────────────────
const Invoice = sequelize.define('Invoice', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:         { type: DataTypes.UUID, allowNull: false },
  customerId:      { type: DataTypes.UUID, allowNull: true },
  userId:          { type: DataTypes.UUID },
  recurringId:     { type: DataTypes.UUID, allowNull: true },
  repairId:        { type: DataTypes.UUID, allowNull: true },
  invoiceNumber:   { type: DataTypes.STRING },
  status:          { type: DataTypes.ENUM('draft','sent','paid','overdue','void'), defaultValue: 'draft' },
  lineItemsJson:   { type: DataTypes.TEXT, defaultValue: '[]' },
  subtotal:        { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  taxRate:         { type: DataTypes.DECIMAL(5,4), defaultValue: 0 },
  taxAmount:       { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total:           { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  paidAmount:      { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  dueDate:         { type: DataTypes.DATEONLY },
  paidAt:          { type: DataTypes.DATE },
  sentAt:          { type: DataTypes.DATE },
  paymentMethod:   { type: DataTypes.STRING },
  notes:           { type: DataTypes.TEXT },
});

// ── Estimate ──────────────────────────────────────────────────────────────────
const Estimate = sequelize.define('Estimate', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:        { type: DataTypes.UUID, allowNull: false },
  customerId:     { type: DataTypes.UUID, allowNull: true },
  userId:         { type: DataTypes.UUID },
  repairId:       { type: DataTypes.UUID, allowNull: true },
  estimateNumber: { type: DataTypes.STRING },
  status:         { type: DataTypes.ENUM('draft','sent','viewed','approved','declined','expired'), defaultValue: 'draft' },
  lineItemsJson:  { type: DataTypes.TEXT, defaultValue: '[]' },
  subtotal:       { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  taxRate:        { type: DataTypes.DECIMAL(5,4), defaultValue: 0 },
  taxAmount:      { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total:          { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  notes:          { type: DataTypes.TEXT },
  validDays:      { type: DataTypes.INTEGER, defaultValue: 30 },
  validUntil:     { type: DataTypes.DATE },
  sentAt:         { type: DataTypes.DATE },
  approvedAt:     { type: DataTypes.DATE },
  declinedAt:     { type: DataTypes.DATE },
  approvalToken:  { type: DataTypes.STRING },
  customerNotes:  { type: DataTypes.TEXT },
});

// ── RepairAttachment ──────────────────────────────────────────────────────────
const RepairAttachment = sequelize.define('RepairAttachment', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  repairId:     { type: DataTypes.UUID, allowNull: false },
  storeId:      { type: DataTypes.UUID },
  userId:       { type: DataTypes.UUID },
  filename:     { type: DataTypes.STRING },
  originalName: { type: DataTypes.STRING },
  mimeType:     { type: DataTypes.STRING },
  size:         { type: DataTypes.INTEGER },
  url:          { type: DataTypes.STRING },
});

// ── RepairTimeLog ─────────────────────────────────────────────────────────────
const RepairTimeLog = sequelize.define('RepairTimeLog', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  repairId:  { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID },
  storeId:   { type: DataTypes.UUID },
  startedAt: { type: DataTypes.DATE },
  endedAt:   { type: DataTypes.DATE },
  minutes:   { type: DataTypes.INTEGER, defaultValue: 0 },
  notes:     { type: DataTypes.STRING },
});

// ── Buyback ───────────────────────────────────────────────────────────────────
const Buyback = sequelize.define('Buyback', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:      { type: DataTypes.UUID, allowNull: false },
  customerId:   { type: DataTypes.UUID },
  userId:       { type: DataTypes.UUID },
  ticketNumber: { type: DataTypes.STRING },
  deviceBrand:  { type: DataTypes.STRING },
  deviceModel:  { type: DataTypes.STRING },
  deviceColor:  { type: DataTypes.STRING },
  imei:         { type: DataTypes.STRING },
  storage:      { type: DataTypes.STRING },
  condition:    { type: DataTypes.ENUM('excellent','good','fair','poor'), defaultValue: 'good' },
  quotedPrice:  { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  finalPrice:   { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  paymentMethod:{ type: DataTypes.STRING, defaultValue: 'cash' },
  status:       { type: DataTypes.ENUM('pending','completed','declined'), defaultValue: 'completed' },
  addToInventory: { type: DataTypes.BOOLEAN, defaultValue: false },
  inventoryItemId:{ type: DataTypes.UUID },
  notes:        { type: DataTypes.TEXT },
});

// ── GiftCard ──────────────────────────────────────────────────────────────────
const GiftCard = sequelize.define('GiftCard', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:        { type: DataTypes.UUID, allowNull: false },
  code:           { type: DataTypes.STRING(20), allowNull: false, unique: true },
  initialBalance: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  balance:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  customerId:     { type: DataTypes.UUID, allowNull: true },
  userId:         { type: DataTypes.UUID },
  status:         { type: DataTypes.ENUM('active', 'depleted', 'void'), defaultValue: 'active' },
  note:           { type: DataTypes.STRING },
});

// ── Expense ───────────────────────────────────────────────────────────────────
const Expense = sequelize.define('Expense', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:     { type: DataTypes.UUID, allowNull: false },
  userId:      { type: DataTypes.UUID },
  category:    { type: DataTypes.ENUM('rent', 'utilities', 'supplies', 'parts', 'payroll', 'marketing', 'equipment', 'other'), defaultValue: 'other' },
  amount:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  vendor:      { type: DataTypes.STRING },
  date:        { type: DataTypes.DATEONLY, allowNull: false },
  notes:       { type: DataTypes.TEXT },
});

// ── SalesGoal ─────────────────────────────────────────────────────────────────
const SalesGoal = sequelize.define('SalesGoal', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:   { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID, allowNull: true },
  type:      { type: DataTypes.ENUM('revenue', 'repairs', 'activations', 'transactions'), defaultValue: 'revenue' },
  period:    { type: DataTypes.ENUM('daily', 'weekly', 'monthly'), defaultValue: 'monthly' },
  target:    { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  startDate: { type: DataTypes.DATEONLY },
  endDate:   { type: DataTypes.DATEONLY },
  notes:     { type: DataTypes.TEXT },
});

// ── ShiftSchedule ─────────────────────────────────────────────────────────────
const ShiftSchedule = sequelize.define('ShiftSchedule', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:   { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime:   { type: DataTypes.DATE, allowNull: false },
  role:      { type: DataTypes.STRING },
  notes:     { type: DataTypes.TEXT },
  status:    { type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'), defaultValue: 'scheduled' },
});

// ── StoreTransfer ─────────────────────────────────────────────────────────────
const StoreTransfer = sequelize.define('StoreTransfer', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fromStoreId:  { type: DataTypes.UUID, allowNull: false },
  toStoreId:    { type: DataTypes.UUID, allowNull: false },
  itemId:       { type: DataTypes.UUID, allowNull: false },
  quantity:     { type: DataTypes.INTEGER, allowNull: false },
  requestedBy:  { type: DataTypes.UUID },
  approvedBy:   { type: DataTypes.UUID },
  status:       { type: DataTypes.ENUM('pending', 'approved', 'shipped', 'received', 'cancelled'), defaultValue: 'pending' },
  notes:        { type: DataTypes.TEXT },
  shippedAt:    { type: DataTypes.DATE },
  receivedAt:   { type: DataTypes.DATE },
});

// ── Coupon ────────────────────────────────────────────────────────────────────
const Coupon = sequelize.define('Coupon', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code:           { type: DataTypes.STRING(32), allowNull: false, unique: true },
  type:           { type: DataTypes.ENUM('percent', 'fixed'), defaultValue: 'percent' },
  value:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  maxUses:        { type: DataTypes.INTEGER, allowNull: true },
  usedCount:      { type: DataTypes.INTEGER, defaultValue: 0 },
  expiresAt:      { type: DataTypes.DATE, allowNull: true },
  active:         { type: DataTypes.BOOLEAN, defaultValue: true },
  description:    { type: DataTypes.STRING },
  stripeCouponId: { type: DataTypes.STRING, allowNull: true },
});

// ── PartsCatalogItem ──────────────────────────────────────────────────────────
const PartsCatalogItem = sequelize.define('PartsCatalogItem', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  storeId:          { type: DataTypes.UUID, allowNull: false },
  name:             { type: DataTypes.STRING, allowNull: false },
  sku:              { type: DataTypes.STRING },
  brand:            { type: DataTypes.STRING },
  deviceModel:      { type: DataTypes.STRING },
  description:      { type: DataTypes.TEXT },
  cost:             { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  price:            { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  supplierId:       { type: DataTypes.UUID, allowNull: true },
  quantity:         { type: DataTypes.INTEGER, defaultValue: 0 },
  active:           { type: DataTypes.BOOLEAN, defaultValue: true },
  condition:        { type: DataTypes.ENUM('new', 'refurbished', 'oem', 'aftermarket'), defaultValue: 'new' },
  imageUrl:         { type: DataTypes.STRING(500) },
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

// Buyback associations
Store.hasMany(Buyback,    { foreignKey: 'storeId' });
Buyback.belongsTo(Store,  { foreignKey: 'storeId' });
Customer.hasMany(Buyback, { foreignKey: 'customerId' });
Buyback.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Buyback,     { foreignKey: 'userId' });
Buyback.belongsTo(User,   { foreignKey: 'userId' });

// RecurringInvoice associations
Store.hasMany(RecurringInvoice,    { foreignKey: 'storeId' });
RecurringInvoice.belongsTo(Store,  { foreignKey: 'storeId' });
Customer.hasMany(RecurringInvoice, { foreignKey: 'customerId' });
RecurringInvoice.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(RecurringInvoice,     { foreignKey: 'userId' });
RecurringInvoice.belongsTo(User,   { foreignKey: 'userId' });
RecurringInvoice.hasMany(Invoice,  { foreignKey: 'recurringId', as: 'invoices' });
Invoice.belongsTo(RecurringInvoice, { foreignKey: 'recurringId', as: 'recurring' });

// Invoice associations
Store.hasMany(Invoice,    { foreignKey: 'storeId' });
Invoice.belongsTo(Store,  { foreignKey: 'storeId' });
Customer.hasMany(Invoice, { foreignKey: 'customerId' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Invoice,     { foreignKey: 'userId' });
Invoice.belongsTo(User,   { foreignKey: 'userId' });

// Estimate associations
Store.hasMany(Estimate,    { foreignKey: 'storeId' });
Estimate.belongsTo(Store,  { foreignKey: 'storeId' });
Customer.hasMany(Estimate, { foreignKey: 'customerId' });
Estimate.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(Estimate,     { foreignKey: 'userId' });
Estimate.belongsTo(User,   { foreignKey: 'userId' });
RepairTicket.hasMany(Estimate, { foreignKey: 'repairId' });
Estimate.belongsTo(RepairTicket, { foreignKey: 'repairId', as: 'repair' });

// RepairAttachment associations
RepairTicket.hasMany(RepairAttachment, { foreignKey: 'repairId', as: 'attachments' });
RepairAttachment.belongsTo(RepairTicket, { foreignKey: 'repairId' });
User.hasMany(RepairAttachment, { foreignKey: 'userId' });
RepairAttachment.belongsTo(User, { foreignKey: 'userId' });

// RepairTimeLog associations
RepairTicket.hasMany(RepairTimeLog, { foreignKey: 'repairId', as: 'timeLogs' });
RepairTimeLog.belongsTo(RepairTicket, { foreignKey: 'repairId' });
User.hasMany(RepairTimeLog, { foreignKey: 'userId' });
RepairTimeLog.belongsTo(User, { foreignKey: 'userId' });

Store.hasMany(GiftCard,   { foreignKey: 'storeId' });
GiftCard.belongsTo(Store, { foreignKey: 'storeId' });
Customer.hasMany(GiftCard, { foreignKey: 'customerId' });
GiftCard.belongsTo(Customer, { foreignKey: 'customerId' });
User.hasMany(GiftCard,    { foreignKey: 'userId' });
GiftCard.belongsTo(User,  { foreignKey: 'userId' });

Store.hasMany(Expense,    { foreignKey: 'storeId' });
Expense.belongsTo(Store,  { foreignKey: 'storeId' });
User.hasMany(Expense,     { foreignKey: 'userId' });
Expense.belongsTo(User,   { foreignKey: 'userId' });

// SalesGoal
Store.hasMany(SalesGoal,  { foreignKey: 'storeId' });
SalesGoal.belongsTo(Store, { foreignKey: 'storeId' });
User.hasMany(SalesGoal,   { foreignKey: 'userId' });
SalesGoal.belongsTo(User, { foreignKey: 'userId' });

// ShiftSchedule
Store.hasMany(ShiftSchedule, { foreignKey: 'storeId' });
ShiftSchedule.belongsTo(Store, { foreignKey: 'storeId' });
User.hasMany(ShiftSchedule,  { foreignKey: 'userId' });
ShiftSchedule.belongsTo(User, { foreignKey: 'userId' });

// StoreTransfer
InventoryItem.hasMany(StoreTransfer, { foreignKey: 'itemId' });
StoreTransfer.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });
StoreTransfer.belongsTo(Store, { foreignKey: 'fromStoreId', as: 'fromStore' });
StoreTransfer.belongsTo(Store, { foreignKey: 'toStoreId', as: 'toStore' });

// PartsCatalogItem
Store.hasMany(PartsCatalogItem, { foreignKey: 'storeId' });
PartsCatalogItem.belongsTo(Store, { foreignKey: 'storeId' });
PartsCatalogItem.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

module.exports = {
  Store, User, Customer, InventoryItem, License, StripePlan, Message, Coupon,
  RepairTicket, RepairPart,
  Transaction, TransactionItem,
  Activation, Commission,
  Appointment,
  Supplier, PurchaseOrder, PurchaseOrderItem,
  SerialNumber,
  TimeEntry,
  LoyaltyAccount, LoyaltyTransaction,
  LayawayPlan, LayawayPayment,
  Campaign, AdminCampaign,
  BillPayment,
  InventoryCount, InventoryCountItem,
  SubscriptionPlan, Subscription,
  Setting, Announcement, StoreNote,
  GiftCard, Expense,
  Buyback,
  Estimate,
  RepairAttachment,
  RepairTimeLog,
  RecurringInvoice,
  Invoice,
  SalesGoal, ShiftSchedule, StoreTransfer, PartsCatalogItem,
};
