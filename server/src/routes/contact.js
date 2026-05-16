const router = require('express').Router();
const twilio = require('twilio');

router.post('/', async (req, res) => {
  const { name, email, phone, business, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }

  const body = [
    `New contact form submission from celltechpos.com`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Business: ${business || 'Not provided'}`,
    ``,
    `Message:`,
    message,
  ].join('\n');

  // Send via SMS to owner's number as a notification
  try {
    const sid   = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from  = process.env.TWILIO_FROM;
    const ownerPhone = process.env.OWNER_PHONE || '+13216950459';

    if (sid && token && from) {
      const client = twilio(sid, token);
      await client.messages.create({
        to: ownerPhone,
        from,
        body: `CellTechPOS inquiry from ${name} (${email}${phone ? ', ' + phone : ''}): ${message.substring(0, 120)}${message.length > 120 ? '...' : ''}`,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact notification failed:', err.message);
    res.json({ ok: true });
  }
});

module.exports = router;
