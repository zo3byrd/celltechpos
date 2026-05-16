const router = require('express').Router();
const { Op } = require('sequelize');
const { Customer, RepairTicket, Transaction, Activation } = require('../db/models');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = { storeId: req.user.storeId };
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await Customer.findAndCountAll({
      where,
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ customers: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, storeId: req.user.storeId },
      include: [
        { model: RepairTicket, order: [['createdAt', 'DESC']], limit: 10 },
        { model: Transaction, order: [['createdAt', 'DESC']], limit: 10 },
        { model: Activation, order: [['createdAt', 'DESC']], limit: 10 },
      ],
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    await customer.update(req.body);
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const rows = await Customer.findAll({
      where: { storeId: req.user.storeId },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['First Name','Last Name','Email','Phone','Address','City','State','Zip','Notes','Created'].join(',');
    const lines = rows.map(c => [
      c.firstName, c.lastName, c.email, c.phone,
      c.address, c.city, c.state, c.zip, c.notes,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    ].map(escape).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send([header, ...lines].join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CSV import
router.post('/import/csv', auth, async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
    upload.single('file')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const text = req.file.buffer.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });

      // Detect header column positions (flexible column order)
      const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const col = name => {
        const aliases = {
          firstName: ['first name', 'firstname', 'first'],
          lastName:  ['last name', 'lastname', 'last'],
          email:     ['email', 'e-mail'],
          phone:     ['phone', 'mobile', 'cell'],
          address:   ['address', 'street'],
          city:      ['city'],
          state:     ['state'],
          zip:       ['zip', 'zipcode', 'postal'],
          notes:     ['notes', 'note'],
        };
        const opts = aliases[name] || [name];
        for (const o of opts) {
          const idx = header.indexOf(o);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const parseRow = line => {
        const cols = [];
        let inQ = false, cur = '';
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        cols.push(cur.trim());
        return cols;
      };

      let created = 0, skipped = 0, errors = 0;
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const row = parseRow(line);
        const get = name => { const i = col(name); return i >= 0 ? (row[i] || '').replace(/^"|"$/g, '').trim() : ''; };
        const firstName = get('firstName');
        const lastName  = get('lastName');
        if (!firstName && !lastName) { skipped++; continue; }
        try {
          await Customer.create({
            storeId: req.user.storeId,
            firstName: firstName || 'Unknown',
            lastName:  lastName  || '',
            email:   get('email'),
            phone:   get('phone'),
            address: get('address'),
            city:    get('city'),
            state:   get('state'),
            zip:     get('zip'),
            notes:   get('notes'),
          });
          created++;
        } catch { errors++; }
      }
      res.json({ created, skipped, errors, total: lines.length - 1 });
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
