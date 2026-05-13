const router = require('express').Router();
const { Op } = require('sequelize');
const { RepairTicket, RepairPart, Customer, User, InventoryItem } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

function ticketNumber() {
  return 'RPR-' + Date.now().toString().slice(-8);
}

// List tickets
router.get('/', auth, async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const where = { storeId: req.user.storeId };
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { ticketNumber: { [Op.iLike]: `%${search}%` } },
      { deviceBrand: { [Op.iLike]: `%${search}%` } },
      { deviceModel: { [Op.iLike]: `%${search}%` } },
      { imei: { [Op.iLike]: `%${search}%` } },
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
  if (req.body.status === 'ready' || req.body.status === 'picked_up') {
    req.body.completedAt = new Date();
  }
  await ticket.update(req.body);
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

module.exports = router;
