const router = require('express').Router();
const { Store, Customer, RepairTicket } = require('../db/models');
const { sendSMS, sendEmail } = require('../integrations/messaging');

// Public: get store info for the form
router.get('/store-info', async (req, res) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });
    const store = await Store.findByPk(storeId, {
      attributes: ['id', 'name', 'address', 'city', 'state', 'phone', 'email', 'logoUrl'],
    });
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public: submit a repair request
router.post('/', async (req, res) => {
  try {
    const { storeId, firstName, lastName, phone, email, deviceBrand, deviceModel, deviceType, issueDescription } = req.body;
    if (!storeId || !firstName || !phone || !deviceBrand || !issueDescription) {
      return res.status(400).json({ error: 'storeId, firstName, phone, deviceBrand, issueDescription required' });
    }

    const store = await Store.findByPk(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });

    // Find or create customer by phone
    let customer = await Customer.findOne({ where: { storeId, phone } });
    if (!customer) {
      customer = await Customer.create({ storeId, firstName, lastName: lastName || '', phone, email: email || null });
    }

    const ticketNumber = 'RPR-' + Date.now().toString().slice(-8);
    const ticket = await RepairTicket.create({
      storeId,
      customerId: customer.id,
      ticketNumber,
      deviceType: deviceType || 'phone',
      deviceBrand,
      deviceModel: deviceModel || '',
      issueDescription,
      status: 'received',
      priority: 'normal',
    });

    // Send confirmation
    const sms = `Hi ${firstName}, your repair request at ${store.name} has been received! Ticket: ${ticketNumber}. We'll contact you shortly to confirm your appointment.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937"><h2 style="color:#15803d">${store.name}</h2><p>Hi ${firstName},</p><p>We've received your repair request. Here are your details:</p><p><strong>Ticket #:</strong> ${ticketNumber}<br><strong>Device:</strong> ${deviceBrand} ${deviceModel || ''}<br><strong>Issue:</strong> ${issueDescription}</p><p>Our team will review your request and contact you shortly to confirm your appointment.</p><hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af">Powered by CellTechPOS</p></div>`;

    if (phone) sendSMS(phone, sms).catch(() => {});
    if (email) sendEmail(email, `Repair Request Received — ${ticketNumber}`, html, sms).catch(() => {});

    res.status(201).json({ ticket, ticketNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
