const router = require('express').Router();
const { sequelize } = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const sid = req.user.storeId;
  try {
    const [[overdue], [readyPending], [todayAppts], [lowStock]] = await Promise.all([
      // Repairs open > 7 days
      sequelize.query(
        `SELECT id, ticketNumber, deviceBrand, deviceModel, status, createdAt
         FROM RepairTickets
         WHERE storeId=? AND status NOT IN ('ready','picked_up','cancelled')
           AND createdAt <= datetime('now','-7 days')
         ORDER BY createdAt ASC LIMIT 10`,
        { replacements: [sid] }
      ),
      // Repairs marked ready but not picked up > 2 days
      sequelize.query(
        `SELECT id, ticketNumber, deviceBrand, deviceModel, completedAt
         FROM RepairTickets
         WHERE storeId=? AND status='ready'
           AND completedAt <= datetime('now','-2 days')
         ORDER BY completedAt ASC LIMIT 10`,
        { replacements: [sid] }
      ),
      // Appointments today
      sequelize.query(
        `SELECT id, title, scheduledAt
         FROM Appointments
         WHERE storeId=? AND status NOT IN ('cancelled','completed')
           AND date(scheduledAt)=date('now')
         ORDER BY scheduledAt ASC LIMIT 10`,
        { replacements: [sid] }
      ),
      // Low stock items (qty <= 2, active)
      sequelize.query(
        `SELECT id, name, sku, quantity, category
         FROM InventoryItems
         WHERE storeId=? AND active=1 AND quantity<=2
         ORDER BY quantity ASC LIMIT 10`,
        { replacements: [sid] }
      ),
    ]);

    const alerts = [
      ...overdue.map(r => ({
        type: 'repair_overdue',
        severity: 'warning',
        title: `Repair overdue — ${r.deviceBrand} ${r.deviceModel}`,
        body: `Ticket ${r.ticketNumber} has been open for over 7 days (${r.status})`,
        link: `/app/repairs/${r.id}`,
        ts: r.createdAt,
      })),
      ...readyPending.map(r => ({
        type: 'repair_ready',
        severity: 'info',
        title: `Awaiting pickup — ${r.deviceBrand} ${r.deviceModel}`,
        body: `Ticket ${r.ticketNumber} has been ready for over 2 days`,
        link: `/app/repairs/${r.id}`,
        ts: r.completedAt,
      })),
      ...todayAppts.map(a => ({
        type: 'appointment_today',
        severity: 'success',
        title: `Appointment today`,
        body: a.title + (a.scheduledAt ? ` at ${new Date(a.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''),
        link: `/app/appointments`,
        ts: a.scheduledAt,
      })),
      ...lowStock.map(i => ({
        type: 'low_stock',
        severity: 'error',
        title: `Low stock — ${i.name}`,
        body: `Only ${i.quantity} left in inventory${i.sku ? ` (SKU: ${i.sku})` : ''}`,
        link: `/app/inventory`,
        ts: null,
      })),
    ];

    res.json({
      count: alerts.length,
      alerts,
      summary: {
        repair_overdue:    overdue.length,
        repair_ready:      readyPending.length,
        appointment_today: todayAppts.length,
        low_stock:         lowStock.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
