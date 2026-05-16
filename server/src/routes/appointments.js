const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { Appointment, Customer, User, Store } = require('../db/models');
const { sendSMS, sendEmail } = require('../integrations/messaging');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { date, status, technicianId, search, limit = 50, offset = 0 } = req.query;
    const where = { storeId: req.user.storeId };
    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.scheduledAt = { [Op.gte]: d, [Op.lt]: next };
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } },
        { deviceBrand: { [Op.like]: `%${search}%` } },
      ];
    }
    const rows = await Appointment.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'], required: false },
        { model: User, as: 'technician', attributes: ['id', 'name'], required: false },
      ],
      order: [['scheduledAt', 'ASC']],
    });
    res.json({ appointments: rows.rows, total: rows.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const appt = await Appointment.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(appt);

    // Booking confirmation (non-blocking)
    sendBookingConfirmation(appt, req.user.storeId).catch(() => {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function sendBookingConfirmation(appt, storeId) {
  try {
    const store = await Store.findByPk(storeId);
    if (!store) return;
    const phone = appt.customerPhone;
    const email = appt.customerEmail;
    if (!phone && !email) return;

    const firstName = appt.customerName ? appt.customerName.split(' ')[0] : 'there';
    const date = new Date(appt.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const time = new Date(appt.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const sms = `Hi ${firstName}, your appointment at ${store.name} is confirmed for ${date} at ${time}. Call ${store.phone || 'us'} if you need to reschedule.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937"><h2 style="color:#15803d">${store.name}</h2><p>Hi ${firstName},</p><p>Your appointment has been confirmed!</p><p><strong>Date:</strong> ${date}<br><strong>Time:</strong> ${time}${appt.title ? `<br><strong>Service:</strong> ${appt.title}` : ''}</p><p>If you need to reschedule or cancel, call us at ${store.phone || 'the store'}.</p><p>We look forward to seeing you!</p><hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af">Powered by CellTechPOS</p></div>`;

    if (phone) await sendSMS(phone, sms).catch(() => {});
    if (email) await sendEmail(email, `Appointment Confirmed — ${store.name}`, html, sms).catch(() => {});
  } catch { /* non-fatal */ }
}

router.get('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: Customer, required: false },
        { model: User, as: 'technician', attributes: ['id', 'name'], required: false },
      ],
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    res.json(appt);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    await appt.update(req.body);
    res.json(appt);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    await appt.update({ status: 'cancelled' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
