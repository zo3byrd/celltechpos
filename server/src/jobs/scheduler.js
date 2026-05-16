const cron = require('node-cron');
const { Op } = require('sequelize');
const { Appointment, RepairTicket, Customer, Store, Transaction, InventoryItem, User } = require('../db/models');
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

async function sendLowStockAlerts() {
  try {
    const stores = await Store.findAll({ where: { active: true } });
    for (const store of stores) {
      const lowItems = await InventoryItem.findAll({
        where: {
          storeId: store.id,
          active: true,
          quantity: { [Op.lte]: Op.col('minQuantity') },
        },
        raw: true,
      });
      // fallback manual filter for SQLite col comparison
      const allItems = await InventoryItem.findAll({ where: { storeId: store.id, active: true }, raw: true });
      const low = allItems.filter(i => i.quantity <= (i.minQuantity || 5));
      if (!low.length) continue;

      const admin = await User.findOne({ where: { storeId: store.id, role: { [Op.in]: ['admin', 'superadmin'] }, active: true } });
      if (!admin) continue;

      const itemLines = low.map(i => `• ${i.name}: ${i.quantity} left (min ${i.minQuantity || 5})`).join('\n');
      const smsBody = `[${store.name}] Low stock alert: ${low.length} item${low.length > 1 ? 's' : ''} need restocking.\n${itemLines}`;
      const emailBody = `<p>The following items at <strong>${store.name}</strong> are at or below minimum stock levels:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
          <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Item</th><th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Qty</th><th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Min</th></tr></thead>
          <tbody>${low.map(i => `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${i.name}</td><td style="padding:6px 8px;text-align:center;color:#dc2626;font-weight:bold;border-bottom:1px solid #f3f4f6">${i.quantity}</td><td style="padding:6px 8px;text-align:center;color:#6b7280;border-bottom:1px solid #f3f4f6">${i.minQuantity || 5}</td></tr>`).join('')}</tbody>
        </table>
        <p style="margin-top:16px">Please restock these items to avoid stockouts.</p>`;

      if (admin.email) {
        sendEmail(admin.email, `Low Stock Alert — ${store.name} (${low.length} items)`, wrap(emailBody, store.name), smsBody).catch(() => {});
      }
      console.log(`[scheduler] Low stock alert sent for ${store.name}: ${low.length} items`);
    }
  } catch (err) {
    console.error('[scheduler] Low stock alerts error:', err.message);
  }
}

async function sendDailySalesSummary() {
  try {
    const stores = await Store.findAll({ where: { active: true } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const store of stores) {
      const admin = await User.findOne({ where: { storeId: store.id, role: { [Op.in]: ['admin', 'superadmin'] }, active: true } });
      if (!admin?.email) continue;

      const txns = await Transaction.findAll({
        where: { storeId: store.id, type: 'sale', paymentStatus: 'completed', createdAt: { [Op.gte]: today } },
        raw: true,
      });

      const totalRevenue = txns.reduce((s, t) => s + parseFloat(t.total || 0), 0);
      const totalTax     = txns.reduce((s, t) => s + parseFloat(t.taxAmount || 0), 0);
      const totalTips    = txns.reduce((s, t) => s + parseFloat(t.tipAmount || 0), 0);
      const refunds      = await Transaction.sum('total', {
        where: { storeId: store.id, type: 'refund', createdAt: { [Op.gte]: today } },
      }) || 0;

      const repairsDone  = await RepairTicket.count({ where: { storeId: store.id, status: 'ready', updatedAt: { [Op.gte]: today } } });
      const dateStr      = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const fmt$         = n => '$' + parseFloat(n || 0).toFixed(2);

      const emailBody = `
        <p>Here's your sales summary for <strong>${dateStr}</strong>:</p>
        <table style="width:100%;max-width:400px;border-collapse:collapse;font-size:15px;margin-top:12px">
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Transactions</td><td style="padding:8px 4px;text-align:right;font-weight:bold">${txns.length}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Gross Revenue</td><td style="padding:8px 4px;text-align:right;font-weight:bold;color:#15803d">${fmt$(totalRevenue)}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Tax Collected</td><td style="padding:8px 4px;text-align:right">${fmt$(totalTax)}</td></tr>
          ${totalTips > 0 ? `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Tips Collected</td><td style="padding:8px 4px;text-align:right">${fmt$(totalTips)}</td></tr>` : ''}
          ${refunds > 0   ? `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Refunds</td><td style="padding:8px 4px;text-align:right;color:#dc2626">(${fmt$(Math.abs(refunds))})</td></tr>` : ''}
          <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Repairs Completed</td><td style="padding:8px 4px;text-align:right">${repairsDone}</td></tr>
          <tr style="border-top:2px solid #e5e7eb"><td style="padding:10px 4px;font-weight:bold">Net Revenue</td><td style="padding:10px 4px;text-align:right;font-weight:bold;font-size:18px;color:#15803d">${fmt$(totalRevenue + refunds)}</td></tr>
        </table>`;

      const smsBody = `[${store.name}] Daily summary: ${txns.length} sales, ${fmt$(totalRevenue)} revenue${totalTips > 0 ? `, ${fmt$(totalTips)} tips` : ''}.`;

      sendEmail(admin.email, `Daily Sales Summary — ${store.name} — ${dateStr}`, wrap(emailBody, store.name), smsBody).catch(() => {});
      console.log(`[scheduler] Daily summary sent for ${store.name}`);
    }
  } catch (err) {
    console.error('[scheduler] Daily summary error:', err.message);
  }
}

async function sendReviewRequests() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const tickets = await RepairTicket.findAll({
      where: {
        status: 'picked_up',
        updatedAt: { [Op.gte]: fourHoursAgo, [Op.lte]: twoHoursAgo },
      },
      include: [
        { model: Customer, required: true },
        { model: Store, required: true },
      ],
    });

    for (const ticket of tickets) {
      const store = ticket.Store;
      if (!store.googleReviewUrl) continue;
      const customer = ticket.Customer;
      if (!customer.email && !customer.phone) continue;

      const firstName = customer.firstName || 'Valued Customer';
      const smsBody = `Hi ${firstName}, thanks for choosing ${store.name}! We'd love your feedback: ${store.googleReviewUrl}`;
      const emailBody = `<p>Hi ${firstName},</p><p>Thank you for trusting <strong>${store.name}</strong> with your device repair!</p><p>If you had a great experience, we'd really appreciate a quick review — it means the world to us:</p><p style="margin:20px 0"><a href="${store.googleReviewUrl}" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Leave a Google Review ⭐</a></p><p style="font-size:13px;color:#6b7280">If anything wasn't right, please reply and we'll make it right.</p>`;

      if (customer.phone) sendSMS(customer.phone, smsBody).catch(() => {});
      if (customer.email) sendEmail(customer.email, `How was your repair experience? — ${store.name}`, wrap(emailBody, store.name), smsBody).catch(() => {});
      console.log(`[scheduler] Review request sent for ticket ${ticket.ticketNumber}`);
    }
  } catch (err) {
    console.error('[scheduler] Review requests error:', err.message);
  }
}

function startScheduler() {
  // Daily at 9am — appointment reminders for tomorrow
  cron.schedule('0 9 * * *', sendAppointmentReminders);
  // Daily at 10am — pickup follow-ups for repairs ready 2+ days
  cron.schedule('0 10 * * *', sendPickupFollowUps);
  // Daily at 8am — low stock alerts
  cron.schedule('0 8 * * *', sendLowStockAlerts);
  // Daily at 8pm — sales summary to admin
  cron.schedule('0 20 * * *', sendDailySalesSummary);
  // Every 30 min — review requests for recently picked-up repairs
  cron.schedule('*/30 * * * *', sendReviewRequests);
  console.log('[scheduler] Automated notifications scheduled');
}

module.exports = { startScheduler, sendAppointmentReminders, sendPickupFollowUps, sendLowStockAlerts, sendDailySalesSummary, sendReviewRequests };
