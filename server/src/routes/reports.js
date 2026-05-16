const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { Transaction, TransactionItem, RepairTicket, RepairPart, Activation, InventoryItem, User, Commission } = require('../db/models');
const { auth, requireRole } = require('../middleware/auth');

const sqliteGroupFmt = { day: '%Y-%m-%d', week: '%Y-%W', month: '%Y-%m', year: '%Y' };

// Dashboard summary
router.get('/dashboard', auth, async (req, res) => {
  const storeId = req.user.storeId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todaySales, monthSales,
    openRepairs, completedRepairs,
    pendingActivations, approvedActivations,
    lowStockCount,
  ] = await Promise.all([
    Transaction.sum('total', { where: { storeId, type: 'sale', paymentStatus: 'completed', createdAt: { [Op.gte]: today } } }),
    Transaction.sum('total', { where: { storeId, type: 'sale', paymentStatus: 'completed', createdAt: { [Op.gte]: monthStart } } }),
    RepairTicket.count({ where: { storeId, status: { [Op.notIn]: ['picked_up', 'cancelled'] } } }),
    RepairTicket.count({ where: { storeId, status: 'ready' } }),
    Activation.count({ where: { storeId, status: 'pending' } }),
    Activation.count({ where: { storeId, status: 'approved', createdAt: { [Op.gte]: monthStart } } }),
    InventoryItem.count({ where: { storeId, active: true } }),
  ]);

  const allItems = await InventoryItem.findAll({ where: { storeId, active: true }, attributes: ['quantity', 'minQuantity'] });
  const lowStock = allItems.filter(i => i.quantity <= i.minQuantity).length;

  res.json({
    sales: { today: todaySales || 0, month: monthSales || 0 },
    repairs: { open: openRepairs, ready: completedRepairs },
    activations: { pending: pendingActivations, monthApproved: approvedActivations },
    inventory: { lowStock },
  });
});

// Sales report
router.get('/sales', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  const where = { storeId: req.user.storeId, paymentStatus: 'completed', type: 'sale' };
  if (startDate) where.createdAt = { [Op.gte]: new Date(startDate) };
  if (endDate) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(endDate) };

  const fmt = sqliteGroupFmt[groupBy] || '%Y-%m-%d';
  const transactions = await Transaction.findAll({
    where,
    attributes: [
      [literal(`strftime('${fmt}', \`createdAt\`)`), 'period'],
      [fn('SUM', col('total')), 'revenue'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [literal(`strftime('${fmt}', \`createdAt\`)`)],
    order: [[literal(`strftime('${fmt}', \`createdAt\`)`), 'ASC']],
    raw: true,
  });
  res.json(transactions);
});

// Repair report
router.get('/repairs', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = { storeId: req.user.storeId };
  if (startDate) where.createdAt = { [Op.gte]: new Date(startDate) };
  if (endDate) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(endDate) };

  const byStatus = await RepairTicket.findAll({
    where,
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true,
  });

  const revenue = await Transaction.sum('total', {
    where: { storeId: req.user.storeId, type: 'repair_payment', paymentStatus: 'completed', ...(where.createdAt ? { createdAt: where.createdAt } : {}) },
  });

  res.json({ byStatus, revenue: revenue || 0 });
});

// Activation report
router.get('/activations', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = { storeId: req.user.storeId };
  if (startDate) where.createdAt = { [Op.gte]: new Date(startDate) };
  if (endDate) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(endDate) };

  const byCarrier = await Activation.findAll({
    where,
    attributes: [
      'carrier',
      [fn('COUNT', col('id')), 'count'],
      [fn('SUM', col('commissionAmount')), 'commission'],
      [fn('SUM', col('spiffAmount')), 'spiff'],
    ],
    group: ['carrier'],
    raw: true,
  });

  const byRep = await Activation.findAll({
    where,
    attributes: [
      'salesRepId',
      [fn('COUNT', col('Activation.id')), 'count'],
      [fn('SUM', col('commissionAmount')), 'commission'],
    ],
    include: [{ model: User, as: 'salesRep', attributes: ['name'] }],
    group: ['salesRepId', 'salesRep.id', 'salesRep.name'],
    raw: true,
  });

  res.json({ byCarrier, byRep });
});

// Profit & Loss report
router.get('/profit-loss', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const storeId = req.user.storeId;

  const dateWhere = {};
  if (startDate) dateWhere[Op.gte] = new Date(startDate);
  if (endDate)   dateWhere[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  const txWhere = { storeId, paymentStatus: 'completed', ...(Object.keys(dateWhere).length ? { createdAt: dateWhere } : {}) };

  // ── Revenue ────────────────────────────────────────────────────────────────
  const [salesRevenue, repairRevenue, depositRevenue, refunds] = await Promise.all([
    Transaction.sum('total', { where: { ...txWhere, type: 'sale'           } }),
    Transaction.sum('total', { where: { ...txWhere, type: 'repair_payment' } }),
    Transaction.sum('total', { where: { ...txWhere, type: 'deposit'        } }),
    Transaction.sum('total', { where: { ...txWhere, type: 'refund'         } }),
  ]);

  // ── COGS: items sold ───────────────────────────────────────────────────────
  // Fetch TransactionItems for completed sales, then resolve item costs
  const soldTxIds = await Transaction.findAll({
    where: { ...txWhere, type: 'sale' },
    attributes: ['id'],
    raw: true,
  });
  const txIds = soldTxIds.map(t => t.id);

  let salesCOGS = 0;
  if (txIds.length) {
    const lineItems = await TransactionItem.findAll({
      where: { transactionId: { [Op.in]: txIds } },
      include: [{ model: InventoryItem, as: 'item', attributes: ['cost'], required: false }],
    });
    salesCOGS = lineItems.reduce((sum, li) => {
      const cost = parseFloat(li.item?.cost ?? 0);
      return sum + cost * li.quantity;
    }, 0);
  }

  // ── COGS: repair parts ─────────────────────────────────────────────────────
  const repairTicketIds = await RepairTicket.findAll({
    where: { storeId, ...(Object.keys(dateWhere).length ? { createdAt: dateWhere } : {}) },
    attributes: ['id'],
    raw: true,
  });
  const rIds = repairTicketIds.map(r => r.id);

  let repairPartsCOGS = 0;
  if (rIds.length) {
    const parts = await RepairPart.findAll({ where: { repairId: { [Op.in]: rIds } } });
    repairPartsCOGS = parts.reduce((sum, p) => sum + parseFloat(p.unitCost ?? 0) * p.quantity, 0);
  }

  // ── Commissions paid ───────────────────────────────────────────────────────
  const commissionsPaid = await Commission.sum('total', {
    where: { storeId, status: 'paid', ...(Object.keys(dateWhere).length ? { createdAt: dateWhere } : {}) },
  });

  // ── Activation plan costs collected ───────────────────────────────────────
  const activationRevenue = await Activation.sum('planCost', {
    where: { storeId, status: 'approved', ...(Object.keys(dateWhere).length ? { createdAt: dateWhere } : {}) },
  });

  // ── Calculations ──────────────────────────────────────────────────────────
  const rev = {
    sales:       parseFloat(salesRevenue      || 0),
    repairs:     parseFloat(repairRevenue     || 0),
    deposits:    parseFloat(depositRevenue    || 0),
    activations: parseFloat(activationRevenue || 0),
  };
  rev.total = rev.sales + rev.repairs + rev.deposits + rev.activations;

  const cogs = {
    salesItems:  parseFloat(salesCOGS.toFixed(2)),
    repairParts: parseFloat(repairPartsCOGS.toFixed(2)),
  };
  cogs.total = cogs.salesItems + cogs.repairParts;

  const grossProfit  = rev.total - cogs.total;
  const grossMargin  = rev.total > 0 ? (grossProfit / rev.total) * 100 : 0;

  const expenses = {
    commissions: parseFloat(commissionsPaid || 0),
  };
  expenses.total = expenses.commissions;

  const refundAmt    = parseFloat(refunds || 0);
  const netProfit    = grossProfit - expenses.total - refundAmt;
  const netMargin    = rev.total > 0 ? (netProfit / rev.total) * 100 : 0;

  res.json({
    period: { startDate, endDate },
    revenue: rev,
    cogs,
    grossProfit:  parseFloat(grossProfit.toFixed(2)),
    grossMargin:  parseFloat(grossMargin.toFixed(2)),
    expenses,
    refunds:      refundAmt,
    netProfit:    parseFloat(netProfit.toFixed(2)),
    netMargin:    parseFloat(netMargin.toFixed(2)),
  });
});

// Staff sales leaderboard
router.get('/staff', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const storeId = req.user.storeId;

  const dateWhere = {};
  if (startDate) dateWhere[Op.gte] = new Date(startDate);
  if (endDate)   dateWhere[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));

  const where = { storeId, paymentStatus: 'completed' };
  if (Object.keys(dateWhere).length) where.createdAt = dateWhere;

  const { sequelize: db } = require('../db');

  const [salesRows] = await db.query(`
    SELECT u.id, u.name, u.role,
      COUNT(CASE WHEN t.type = 'sale'           THEN 1 END) as salesCount,
      COALESCE(SUM(CASE WHEN t.type = 'sale'    THEN t.total ELSE 0 END), 0) as salesTotal,
      COUNT(CASE WHEN t.type = 'repair_payment' THEN 1 END) as repairCount,
      COALESCE(SUM(CASE WHEN t.type = 'repair_payment' THEN t.total ELSE 0 END), 0) as repairTotal,
      COALESCE(SUM(t.tipAmount), 0) as tipsTotal
    FROM Users u
    LEFT JOIN Transactions t ON t.userId = u.id
      AND t.storeId = :storeId
      AND t.paymentStatus = 'completed'
      ${startDate ? "AND t.createdAt >= :start" : ''}
      ${endDate   ? "AND t.createdAt <= :end"   : ''}
    WHERE u.storeId = :storeId AND u.active = 1
    GROUP BY u.id, u.name, u.role
    ORDER BY salesTotal DESC
  `, {
    replacements: {
      storeId,
      start: startDate ? new Date(startDate).toISOString() : null,
      end:   endDate   ? new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString() : null,
    },
  });

  res.json(salesRows);
});

module.exports = router;
