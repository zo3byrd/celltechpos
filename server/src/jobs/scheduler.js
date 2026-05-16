const cron = require('node-cron');
const { Op } = require('sequelize');
const { Appointment, RepairTicket, Customer, Store } = require('../db/models');
const { sendSMS, sendEmail } = require('../integrations/messaging');

function wrap(body, storeName) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937"><h2 style="color:#15803d">${storeName}</h2>${body}<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af">Powered by CellTechPOS</p></div>`;
}

async function sendAppointmentReminders() {
  try {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const appts = await Appointment.findAll({
      where: {
        scheduledAt: { [Op.gte]: tomorrowStart, [Op.lt]: tomorrowEnd },
        status: { [Op.notIn]: ['cancelled', 'completed', 'no_show'] },
        reminderSent: false,
      },
      include: [
        { model: Customer, required: false },
        { model: Store, required: true },
      ],
    });

    for (const appt of appts) {
      const store = appt.Store;
      const phone = appt.customerPhone || appt.Customer?.phone;
      const email = appt.customerEmail || appt.Customer?.email;
      const name = appt.customerName || (appt.Customer ? `${appt.Customer.firstName} ${appt.Customer.lastName}` : 'Valued Customer');
      const time = new Date(appt.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const date = new Date(appt.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      const smsBody = `Hi ${name.split(' ')[0]}, reminder: you have an appointment at ${store.name} tomorrow (${date}) at ${time}. Call ${store.phone || 'us'} to reschedule.`;
      const emailBody = `<p>Hi ${name.split(' ')[0]},</p><p>This is a friendly reminder that you have an appointment scheduled at <strong>${store.name}</strong>.</p><p><strong>Date:</strong> ${date}<br><strong>Time:</strong> ${time}${appt.title ? `<br><strong>Service:</strong> ${appt.title}` : ''}</p><p>If you need to reschedule or cancel, please call us at ${store.phone || 'us'}.</p><p>See you tomorrow!</p>`;

      const sends = [];
      if (phone) sends.push(sendSMS(phone, smsBody).catch(() => {}));
      if (email) sends.push(sendEmail(email, `Appointment Reminder — ${store.name}`, wrap(emailBody, store.name), smsBody).catch(() => {}));
      if (sends.length) {
        await Promise.all(sends);
        await appt.update({ reminderSent: true });
        console.log(`[scheduler] Reminder sent for appointment ${appt.id}`);
      }
    }
  } catch (err) {
    console.error('[scheduler] Appointment reminders error:', err.message);
  }
}

async function sendPickupFollowUps() {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const tickets = await RepairTicket.findAll({
      where: {
        status: 'ready',
        completedAt: { [Op.lte]: twoDaysAgo },
      },
      include: [
        { model: Customer, required: true },
        { model: Store, required: true },
      ],
    });

    for (const ticket of tickets) {
      const customer = ticket.Customer;
      const store = ticket.Store;
      if (!customer.phone && !customer.email) continue;

      const smsBody = `Hi ${customer.firstName}, your ${ticket.deviceBrand} ${ticket.deviceModel} is still ready for pickup at ${store.name}. Ticket: ${ticket.ticketNumber}. Please come in at your convenience or call ${store.phone || 'us'}.`;
      const emailBody = `<p>Hi ${customer.firstName},</p><p>Just a reminder that your <strong>${ticket.deviceBrand} ${ticket.deviceModel}</strong> repair is complete and ready for pickup at <strong>${store.name}</strong>.</p><p>Ticket #: <strong>${ticket.ticketNumber}</strong></p><p>Please come in at your earliest convenience. If you have any questions, call us at ${store.phone || 'the store'}.</p>`;

      const sends = [];
      if (customer.phone) sends.push(sendSMS(customer.phone, smsBody).catch(() => {}));
      if (customer.email) sends.push(sendEmail(customer.email, `Your repair is waiting — ${ticket.ticketNumber}`, wrap(emailBody, store.name), smsBody).catch(() => {}));
      await Promise.all(sends);
      console.log(`[scheduler] Pickup follow-up sent for ticket ${ticket.ticketNumber}`);
    }
  } catch (err) {
    console.error('[scheduler] Pickup follow-ups error:', err.message);
  }
}

function startScheduler() {
  // Daily at 9am — appointment reminders for tomorrow
  cron.schedule('0 9 * * *', sendAppointmentReminders);
  // Daily at 10am — pickup follow-ups for repairs ready 2+ days
  cron.schedule('0 10 * * *', sendPickupFollowUps);
  console.log('[scheduler] Automated notifications scheduled');
}

module.exports = { startScheduler, sendAppointmentReminders, sendPickupFollowUps };
