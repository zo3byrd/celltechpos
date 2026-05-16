const router = require('express').Router();
const { Op } = require('sequelize');
const { InventoryItem, Supplier, PurchaseOrder, PurchaseOrderItem } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { category, search, lowStock, page = 1, limit = 50 } = req.query;
    const where = { storeId: req.user.storeId, active: true };
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
      ];
    }

    if (lowStock === 'true') {
      const items = await InventoryItem.findAll({
        where: { ...where, active: true },
        order: [['quantity', 'ASC']],
      });
      const low = items.filter(i => i.quantity <= i.minQuantity);
      return res.json({ items: low, total: low.length });
    }

    const { rows, count } = await InventoryItem.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ items: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/adjust', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { quantity, reason } = req.body;
    await item.increment('quantity', { by: parseInt(quantity) });
    await item.reload();
    res.json({ item, adjustment: quantity, reason });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: { storeId: req.user.storeId, active: true },
      order: [['name', 'ASC']],
    });
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name','SKU','Barcode','Brand','Category','Quantity','Min Qty','Cost','Price','Notes'].join(',');
    const lines = items.map(i => [
      i.name, i.sku, i.barcode, i.brand, i.category,
      i.quantity, i.minQuantity, i.cost, i.price, i.notes,
    ].map(escape).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
    res.send([header, ...lines].join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update({ active: false });
    res.json({ message: 'Item deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-generate purchase orders for items at/below reorder point
router.post('/reorder/generate', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const all = await InventoryItem.findAll({ where: { storeId: req.user.storeId, active: true } });
    const toReorder = all.filter(i => i.quantity <= (i.reorderPoint ?? i.minQuantity ?? 5) && (i.reorderQty || 0) > 0);
    if (!toReorder.length) return res.json({ message: 'No items need reordering', count: 0, orders: [] });

    const bySupplier = {};
    for (const item of toReorder) {
      const key = item.supplierId || '__none__';
      if (!bySupplier[key]) bySupplier[key] = [];
      bySupplier[key].push(item);
    }

    const created = [];
    for (const [supplierId, items] of Object.entries(bySupplier)) {
      const realSupplierId = supplierId !== '__none__' ? supplierId : null;
      const subtotal = items.reduce((s, i) => s + parseFloat(i.cost || 0) * (i.reorderQty || 10), 0);
      const supplier = realSupplierId ? await Supplier.findByPk(realSupplierId) : null;
      const po = await PurchaseOrder.create({
        storeId: req.user.storeId,
        supplierId: realSupplierId,
        status: 'draft',
        expectedAt: new Date(Date.now() + 7 * 86400000),
        totalAmount: parseFloat(subtotal.toFixed(2)),
        notes: `Auto-generated reorder — ${new Date().toLocaleDateString()}`,
      });
      for (const item of items) {
        await PurchaseOrderItem.create({
          poId: po.id,
          itemId: item.id,
          name: item.name,
          sku: item.sku || '',
          orderedQty: item.reorderQty || 10,
          unitCost: item.cost || 0,
          totalCost: parseFloat(item.cost || 0) * (item.reorderQty || 10),
        });
      }
      created.push({ poId: po.id, supplier: supplier?.name || '(No Supplier)', itemCount: items.length, total: subtotal });
    }
    res.json({ message: `Generated ${created.length} purchase order(s)`, count: toReorder.length, orders: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Import supplier price list CSV (columns: sku or name, cost)
router.post('/import/supplier-prices', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
    upload.single('file')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const text = req.file.buffer.toString('utf-8');
      const [headerLine, ...dataLines] = text.split(/\r?\n/).filter(l => l.trim());
      const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const skuIdx  = headers.findIndex(h => h === 'sku');
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'item');
      const costIdx = headers.findIndex(h => h === 'cost' || h === 'price');
      if (costIdx === -1) return res.status(400).json({ error: 'CSV must have a cost or price column' });

      let updated = 0, skipped = 0, errors = 0;
      for (const line of dataLines) {
        if (!line.trim()) continue;
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const sku  = skuIdx  >= 0 ? cols[skuIdx]  : null;
        const name = nameIdx >= 0 ? cols[nameIdx] : null;
        const cost = parseFloat(cols[costIdx]);
        if (isNaN(cost)) { errors++; continue; }
        let item = null;
        if (sku) item = await InventoryItem.findOne({ where: { sku, storeId: req.user.storeId } });
        if (!item && name) item = await InventoryItem.findOne({ where: { name: { [Op.like]: `%${name}%` }, storeId: req.user.storeId } });
        if (!item) { skipped++; continue; }
        await item.update({ cost });
        updated++;
      }
      res.json({ updated, skipped, errors });
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
