const router = require('express').Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { Appointment, Customer, User } = require('../db/models');

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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
