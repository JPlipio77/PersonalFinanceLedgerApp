const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget      = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// ─── Helpers ────────────────────────────────────────────────────────────────

const monthBounds = (month, year) => ({
  start: new Date(year, month - 1, 1),
  end:   new Date(year, month, 1),
});

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard/overview
 * Returns total income, total expenses, net balance, and budget adherence
 * for the requested month/year (defaults to current month).
 */
const getOverview = asyncHandler(async (req, res) => {
  const now   = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year  = parseInt(req.query.year)  || now.getFullYear();
  const { start, end } = monthBounds(month, year);
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const [totals, budgets] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId, isDeleted: false, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id:      '$type',
          total:    { $sum: '$amountUSD' },
          count:    { $sum: 1 },
        },
      },
    ]),
    Budget.find({ userId, month, year }),
  ]);

  const income  = totals.find(t => t._id === 'income')?.total  || 0;
  const expense = totals.find(t => t._id === 'expense')?.total || 0;
  const txCount = totals.reduce((s, t) => s + t.count, 0);

  // Budget adherence: % of budgets where spending is within limit
  let adherenceRate = 1;
  if (budgets.length > 0) {
    const budgetIds = budgets.map(b => b._id);
    const spending = await Transaction.aggregate([
      { $match: { userId, isDeleted: false, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amountUSD' } } },
    ]);
    const spendMap = Object.fromEntries(spending.map(s => [s._id.toString(), s.total]));
    const withinLimit = budgets.filter(b => (spendMap[b.category.toString()] || 0) <= b.limitAmount).length;
    adherenceRate = withinLimit / budgets.length;
  }

  return success(res, {
    month, year,
    income, expense,
    net:            income - expense,
    transactionCount: txCount,
    budgetCount:    budgets.length,
    adherenceRate,
  });
});

/**
 * GET /api/dashboard/recent-transactions
 * Returns the 10 most recent non-deleted transactions.
 */
const getRecentTransactions = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const limit  = Math.min(50, parseInt(req.query.limit) || 10);

  const transactions = await Transaction.find({ userId, isDeleted: false })
    .populate('category', 'name icon color')
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return success(res, transactions);
});

/**
 * GET /api/dashboard/spending-by-category
 * Returns expense totals grouped by category for the requested month/year.
 */
const getSpendingByCategory = asyncHandler(async (req, res) => {
  const now   = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year  = parseInt(req.query.year)  || now.getFullYear();
  const { start, end } = monthBounds(month, year);
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const data = await Transaction.aggregate([
    {
      $match: {
        userId,
        type:      'expense',
        isDeleted: false,
        date:      { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id:   '$category',
        total: { $sum: '$amountUSD' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from:         'categories',
        localField:   '_id',
        foreignField: '_id',
        as:           'category',
      },
    },
    { $unwind: '$category' },
    {
      $project: {
        _id:   0,
        categoryId:   '$_id',
        name:  '$category.name',
        icon:  '$category.icon',
        color: '$category.color',
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  return success(res, data);
});

/**
 * GET /api/dashboard/trend
 * Returns monthly income + expense totals for the last N months.
 */
const getTrend = asyncHandler(async (req, res) => {
  const months = Math.min(24, parseInt(req.query.months) || 6);
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const raw = await Transaction.aggregate([
    {
      $match: {
        userId,
        isDeleted: false,
        date:      { $gte: start },
      },
    },
    {
      $group: {
        _id: {
          year:  { $year:  '$date' },
          month: { $month: '$date' },
          type:  '$type',
        },
        total: { $sum: '$amountUSD' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Build a map keyed by "YYYY-MM" → { income, expense }
  const map = {};
  raw.forEach(({ _id, total }) => {
    const key = `${_id.year}-${String(_id.month).padStart(2, '0')}`;
    if (!map[key]) map[key] = { year: _id.year, month: _id.month, income: 0, expense: 0 };
    map[key][_id.type] = total;
  });

  // Fill in every month in the range (including months with zero activity)
  const result = [];
  for (let i = 0; i < months; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const yr  = d.getFullYear();
    const mo  = d.getMonth() + 1;
    const key = `${yr}-${String(mo).padStart(2, '0')}`;
    result.push(map[key] || { year: yr, month: mo, income: 0, expense: 0 });
  }

  return success(res, result);
});

module.exports = { getOverview, getRecentTransactions, getSpendingByCategory, getTrend };
