const router = require('express').Router();
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');
const { Message, Customer, RepairTicket, Store, User } = require('../db/models');
const { sendSMS, sendEmail, applyTemplate, emailHtml } = require('../integrations/messaging');

router.use(auth);

// ── Templates ──────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'thank_you',
    label: 'Thank You',
    subject: 'Thank you for visiting {{store}}!',
    body: 'Hi {{name}},\n\nThank you for choosing {{store}}! We appreciate your business.\n\nIf you have any questions, feel free to call us at {{storePhone}}.\n\nSee you soon!',
  },
  {
    id: 'repair_received',
    label: 'Repair Received',
    subject: 'Repair Ticket {{ticket}} Received',
    body: 'Hi {{name}},\n\nWe\'ve received your {{device}} for repair (Ticket #{{ticket}}).\n\nWe\'ll contact you once our technician has had a chance to diagnose the issue.\n\n{{store}}\n{{storePhone}}',
  },
  {
    id: 'repair_ready',
    label: 'Ready for Pickup',
    subject: 'Your {{device}} is ready! — Ticket {{ticket}}',
    body: 'Hi {{name}},\n\nGreat news! Your {{device}} repair is complete and ready for pickup (Ticket #{{ticket}}).\n\nPlease bring this message and a valid ID when you come in.\n\nStore hours: Mon–Sat 9am–7pm, Sun 10am–5pm\n\n{{store}}\n{{storePhone}}',
  },
  {
    id: 'repair_update',
    label: 'Status Update',
    subject: 'Update on your repair — Ticket {{ticket}}',
    body: 'Hi {{name}},\n\nThis is an update on your {{device}} repair (Ticket #{{ticket}}).\n\nCurrent status: {{status}}\n\nWe\'ll keep you informed as things progress. Call us if you have any questions.\n\n{{store}}\n{{storePhone}}',
  },
  {
    id: 'waiting_parts',
    label: 'Waiting on Parts',
    subject: 'Parts ordered for your repair — Ticket {{ticket}}',
    body: 'Hi {{name}},\n\nWe\'ve diagnosed your {{device}} and ordered the required parts (Ticket #{{ticket}}).\n\nWe expect them to arrive within 2–5 business days. We\'ll contact you as soon as your repair is complete.\n\n{{store}}\n{{storePhone}}',
  },
  {
    id: 'appointment_reminder',
    label: 'Appointment Reminder',
    subject: 'Reminder: Appointment at {{store}}',
    body: 'Hi {{name}},\n\nThis is a reminder about your upcoming appointment at {{store}}.\n\nIf you need to reschedule or cancel, please call us at {{storePhone}}.\n\nSee you soon!',
  },
  {
    id: 'custom',
    label: 'Custom Message',
    subject: '',
    body: 'Hi {{name}},\n\n',
  },
];

// GET templates
router.get('/templates', (req, res) => res.json(TEMPLATES));

// GET message history for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const msgs = await Message.findAll({
      where: { storeId: req.user.storeId, customerId: req.params.customerId },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET message history for a repair
router.get('/repair/:repairId', async (req, res) => {
  try {
    const msgs = await Message.findAll({
      where: { storeId: req.user.storeId, repairId: req.params.repairId },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all messages (admin view)
router.get('/', async (req, res) => {
  try {
    const { type, status, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (type) where.type = type;
    if (status) where.status = status;
    const msgs = await Message.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName'] },
        { model: User, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ messages: msgs.rows, total: msgs.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST send a message
router.post('/send', async (req, res) => {
  const { type, to, subject, body, customerId, repairId, templateId } = req.body;

  if (!type || !to || !body) {
    return res.status(400).json({ error: 'type, to, and body are required' });
  }

  // Build template vars
  const store = await Store.findByPk(req.user.storeId);
  let customer = null;
  if (customerId) customer = await Customer.findByPk(customerId);
  let repair = null;
  if (repairId) repair = await RepairTicket.findByPk(repairId);

  const vars = {
    name:       customer ? customer.firstName : 'Valued Customer',
    store:      store?.name || 'CellTechPOS',
    storePhone: store?.phone || '',
    ticket:     repair?.ticketNumber || '',
    device:     repair ? `${repair.deviceBrand || ''} ${repair.deviceModel || ''}`.trim() : '',
    status:     repair ? repair.status?.replace('_', ' ') : '',
  };

  const resolvedBody    = applyTemplate(body, vars);
  const resolvedSubject = applyTemplate(subject || '', vars);

  // Save as pending first
  const msg = await Message.create({
    storeId: req.user.storeId,
    customerId: customerId || null,
    repairId:   repairId   || null,
    userId:     req.user.id,
    type, to,
    subject: resolvedSubject,
    body: resolvedBody,
    status: 'pending',
  });

  // Try to send
  try {
    let ref;
    if (type === 'sms') {
      ref = await sendSMS(to, resolvedBody);
    } else {
      const html = emailHtml(resolvedBody, store?.name, store?.phone);
      ref = await sendEmail(to, resolvedSubject, html, resolvedBody);
    }
    await msg.update({ status: 'sent', providerRef: ref.providerRef, error: null });
    res.status(201).json({ ...msg.toJSON(), status: 'sent' });
  } catch (err) {
    await msg.update({ status: 'failed', error: err.message });
    res.status(424).json({ error: err.message, code: 'SEND_FAILED', messageId: msg.id });
  }
});

// GET check config status
router.get('/config/status', async (req, res) => {
  res.json({
    sms:   !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM),
    email: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    twilioFrom: process.env.TWILIO_FROM || null,
    smtpFrom:   process.env.SMTP_FROM || process.env.SMTP_USER || null,
  });
});

module.exports = router;
