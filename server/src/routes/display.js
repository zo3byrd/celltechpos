const router = require('express').Router();
const { RepairTicket, Customer, User } = require('../db/models');

// Public route — no auth, but requires storeId in query
router.get('/', async (req, res) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    const tickets = await RepairTicket.findAll({
      where: {
        storeId,
        status: ['received', 'diagnosing', 'waiting_parts', 'in_repair', 'quality_check', 'ready'],
      },
      attributes: ['id', 'ticketNumber', 'status', 'priority', 'deviceBrand', 'deviceModel', 'deviceType', 'createdAt', 'dueDate', 'customerId'],
      include: [
        { model: Customer, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'technician', attributes: ['name'] },
      ],
      order: [['priority', 'DESC'], ['createdAt', 'ASC']],
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json({ tickets, ts: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public ticket lookup — by ticket number or phone
router.get('/lookup', async (req, res) => {
  try {
    const { ticket, phone, storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    let where = { storeId };
    if (ticket) {
      where.ticketNumber = ticket.toUpperCase();
    } else if (phone) {
      // find customer first
      const { Op } = require('sequelize');
      const cust = await Customer.findOne({ where: { storeId, phone: { [Op.like]: `%${phone.replace(/\D/g,'')}%` } } });
      if (!cust) return res.json({ tickets: [] });
      where.customerId = cust.id;
    } else {
      return res.status(400).json({ error: 'ticket or phone required' });
    }

    const tickets = await RepairTicket.findAll({
      where,
      attributes: ['id', 'ticketNumber', 'status', 'deviceBrand', 'deviceModel', 'issueDescription', 'estimatedCost', 'finalCost', 'dueDate', 'createdAt', 'notes'],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({ tickets });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
