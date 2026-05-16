const router = require('express').Router();
const { Op } = require('sequelize');
const { RepairTicket, RepairPart, Customer, User, InventoryItem, Store } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');
const { sendEmail, sendSMS } = require('../integrations/messaging');

const STATUS_MESSAGES = {
  diagnosed: (ticket, store, customer) => ({
    subject: `Repair Update — ${ticket.ticketNumber}`,
    sms: `Hi ${customer.firstName}, your ${ticket.deviceBrand} ${ticket.deviceModel} at ${store.name} has been diagnosed. We'll be in touch soon. Ticket: ${ticket.ticketNumber}`,
    email: `<p>Hi ${customer.firstName},</p><p>Your <strong>${ticket.deviceBrand} ${ticket.deviceModel}</strong> has been diagnosed at <strong>${store.name}</strong>.</p><p>Ticket #: <strong>${ticket.ticketNumber}</strong></p><p>We will contact you shortly with a quote and estimated completion time.</p>`,
  }),
  ready: (ticket, store, customer) => ({
    subject: `Your repair is ready! — ${ticket.ticketNumber}`,
    sms: `Great news, ${customer.firstName}! Your ${ticket.deviceBrand} ${ticket.deviceModel} repair at ${store.name} is ready for pickup. Ticket: ${ticket.ticketNumber}`,
    email: `<p>Hi ${customer.firstName},</p><p>Your <strong>${ticket.deviceBrand} ${ticket.deviceModel}</strong> repair at <strong>${store.name}</strong> is <strong>ready for pickup</strong>! 🎉</p><p>Ticket #: <strong>${ticket.ticketNumber}</strong></p><p>Please come in at your earliest convenience. Our team looks forward to seeing you!</p>`,
  }),
  picked_up: (ticket, store, customer) => {
    const reviewPart = store.googleReviewUrl ? ` We'd love your feedback: ${store.googleReviewUrl}` : '';
    return {
      subject: `Thanks for choosing ${store.name}!`,
      sms: `Thanks ${customer.firstName}! We hope your ${ticket.deviceBrand} ${ticket.deviceModel} is working great.${reviewPart}`,
      email: `<p>Hi ${customer.firstName},</p><p>Thank you for choosing <strong>${store.name}</strong> for your repair!</p><p>We hope your <strong>${ticket.deviceBrand} ${ticket.deviceModel}</strong> is working perfectly. If you experience any issues, don't hesitate to reach out — your repair is covered by our warranty.</p>${store.googleReviewUrl ? `<p style="margin-top:16px"><a href="${store.googleReviewUrl}" style="background:#166534;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Leave Us a Review ⭐</a></p>` : ''}`,
    };
  },
  cancelled: (ticket, store, customer) => ({
    subject: `Repair Cancelled — ${ticket.ticketNumber}`,
    sms: `Hi ${customer.firstName}, your repair ticket ${ticket.ticketNumber} at ${store.name} has been cancelled. Please contact us if you have questions.`,
    email: `<p>Hi ${customer.firstName},</p><p>Your repair ticket <strong>${ticket.ticketNumber}</strong> at <strong>${store.name}</strong> has been <strong>cancelled</strong>.</p><p>If you have any questions or would like to reschedule, please don't hesitate to contact us.</p>`,
  }),
};

async function notifyCustomer(ticket, newStatus) {
  const msgs = STATUS_MESSAGES[newStatus];
  if (!msgs || !ticket.customerId) return;

  try {
    const [customer, store] = await Promise.all([
      Customer.findByPk(ticket.customerId),
      Store.findByPk(ticket.storeId),
    ]);
    if (!customer || !store) return;

    const { subject, sms, email } = msgs(ticket, store, customer);
    const wrap = body => `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937"><h2 style="color:#15803d">${store.name}</h2>${body}<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af">Powered by CellTechPOS</p></div>`;

    if (customer.email) {
      sendEmail(customer.email, subject, wrap(email), sms).catch(() => {});
    }
    if (customer.phone) {
      sendSMS(customer.phone, sms).catch(() => {});
    }
  } catch { /* non-fatal */ }
}

function ticketNumber() {
  return 'RPR-' + Date.now().toString().slice(-8);
}

// Warranty check — must come before /:id to avoid conflict
router.get('/warranty-check', auth, async (req, res) => {
  try {
    const { customerId, deviceBrand } = req.query;
    if (!customerId) return res.json({ inWarranty: false });
    const where = {
      storeId: req.user.storeId,
      customerId,
      status: 'picked_up',
      completedAt: { [Op.ne]: null },
    };
    if (deviceBrand) where.deviceBrand = { [Op.like]: `%${deviceBrand}%` };
    const tickets = await RepairTicket.findAll({ where, order: [['completedAt', 'DESC']], limit: 10 });
    const now = new Date();
    for (const t of tickets) {
      if (!t.warrantyDays) continue;
      const expiry = new Date(t.completedAt);
      expiry.setDate(expiry.getDate() + t.warrantyDays);
      if (expiry >= now) {
        return res.json({ inWarranty: true, ticket: t, expiresAt: expiry.toISOString() });
      }
    }
    res.json({ inWarranty: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List tickets
router.get('/', auth, async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const where = { storeId: req.user.storeId };
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { ticketNumber: { [Op.like]: `%${search}%` } },
      { deviceBrand: { [Op.like]: `%${search}%` } },
      { deviceModel: { [Op.like]: `%${search}%` } },
      { imei: { [Op.like]: `%${search}%` } },
    ];
  }
  const { rows, count } = await RepairTicket.findAndCountAll({
    where,
    include: [
      { model: Customer },
      { model: User, as: 'technician', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  res.json({ tickets: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
});

// Get single ticket
router.get('/:id', auth, async (req, res) => {
  const ticket = await RepairTicket.findOne({
    where: { id: req.params.id, storeId: req.user.storeId },
    include: [
      { model: Customer },
      { model: User, as: 'technician', attributes: ['id', 'name'] },
      { model: RepairPart, include: [{ model: InventoryItem, as: 'item' }] },
    ],
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// Create ticket
router.post('/', auth, async (req, res) => {
  const ticket = await RepairTicket.create({
    ...req.body,
    storeId: req.user.storeId,
    ticketNumber: ticketNumber(),
  });
  res.status(201).json(ticket);
});

// Update ticket
router.put('/:id', auth, async (req, res) => {
  const ticket = await RepairTicket.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const prevStatus = ticket.status;
  if (req.body.status === 'ready' || req.body.status === 'picked_up') {
    req.body.completedAt = new Date();
  }
  await ticket.update(req.body);
  if (req.body.status && req.body.status !== prevStatus) {
    notifyCustomer(ticket, req.body.status);
  }
  res.json(ticket);
});

// Add part to ticket
router.post('/:id/parts', auth, async (req, res) => {
  const ticket = await RepairTicket.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const item = await InventoryItem.findOne({ where: { id: req.body.itemId, storeId: req.user.storeId } });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const qty = req.body.quantity || 1;
  if (item.quantity < qty) return res.status(400).json({ error: 'Insufficient stock' });

  const part = await RepairPart.create({
    repairId: ticket.id,
    itemId: item.id,
    quantity: qty,
    unitCost: req.body.unitCost ?? item.cost,
    unitPrice: req.body.unitPrice ?? item.price,
  });
  await item.decrement('quantity', { by: qty });
  res.status(201).json(part);
});

// Remove part
router.delete('/:id/parts/:partId', auth, async (req, res) => {
  const part = await RepairPart.findOne({ where: { id: req.params.partId, repairId: req.params.id } });
  if (!part) return res.status(404).json({ error: 'Part not found' });
  await InventoryItem.increment('quantity', { by: part.quantity, where: { id: part.itemId } });
  await part.destroy();
  res.json({ message: 'Part removed' });
});

// Status history / notes update
router.post('/:id/notes', auth, async (req, res) => {
  const ticket = await RepairTicket.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const field = req.body.internal ? 'internalNotes' : 'notes';
  await ticket.update({ [field]: req.body.text });
  res.json(ticket);
});

// CSV export
router.get('/export/csv', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    const tickets = await RepairTicket.findAll({
      where,
      include: [{ model: Customer }],
      order: [['createdAt', 'DESC']],
    });
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Ticket #','Status','Priority','Customer','Phone','Device','Model','IMEI','Estimate','Final Cost','Deposit','Due Date','Created'].join(',');
    const lines = tickets.map(t => {
      const cust = t.Customer;
      return [
        t.ticketNumber, t.status, t.priority,
        cust ? `${cust.firstName} ${cust.lastName}` : '',
        cust?.phone ?? '',
        t.deviceBrand, t.deviceModel, t.imei,
        t.estimatedCost, t.finalCost, t.deposit,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
      ].map(escape).join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="repairs.csv"');
    res.send([header, ...lines].join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
