const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');

// ─── Monthly Report ──────────────────────────────────────────────────────────

const getMonthlyReport = asyncHandler(async (req, res) => {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year  = parseInt(req.query.year)  || new Date().getFullYear();

  if (month < 1 || month > 12) return error(res, 'month must be 1–12', 422);

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);
  const userId = req.user._id;

  const [summary, byCategory, budgets] = await Promise.all([
    // income / expense totals
    Transaction.aggregate([
      { $match: { userId, isDeleted: false, date: { $gte: start, $lt: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),

    // spending per category
    Transaction.aggregate([
      { $match: { userId, isDeleted: false, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $project: {
        categoryId: '$_id',
        name:  { $ifNull: ['$cat.name', 'Unknown'] },
        icon:  { $ifNull: ['$cat.icon', '❓'] },
        color: { $ifNull: ['$cat.color', '#6b7280'] },
        total: 1,
        count: 1,
      }},
      { $sort: { total: -1 } },
    ]),

    // budgets for the month
    Budget.find({ userId, month, year }).populate('category', 'name icon color').lean(),
  ]);

  const income  = summary.find((s) => s._id === 'income')?.total  || 0;
  const expense = summary.find((s) => s._id === 'expense')?.total || 0;
  const txCount = summary.reduce((a, s) => a + s.count, 0);

  // Enrich budgets with spent amount
  const spentMap = {};
  byCategory.forEach((c) => { spentMap[c.categoryId.toString()] = c.total; });
  const enrichedBudgets = budgets.map((b) => {
    const spent = spentMap[b.category?._id?.toString()] || 0;
    return {
      ...b,
      spent,
      remaining:   Math.max(0, b.limitAmount - spent),
      percentUsed: b.limitAmount > 0 ? parseFloat((spent / b.limitAmount * 100).toFixed(1)) : 0,
    };
  });

  return success(res, {
    month, year,
    income, expense,
    net: income - expense,
    transactionCount: txCount,
    byCategory,
    budgets: enrichedBudgets,
  });
});

// ─── Yearly Report ───────────────────────────────────────────────────────────

const getYearlyReport = asyncHandler(async (req, res) => {
  const year   = parseInt(req.query.year) || new Date().getFullYear();
  const userId = req.user._id;

  const start = new Date(year, 0, 1);
  const end   = new Date(year + 1, 0, 1);

  const [monthlyTotals, categoryTotals] = await Promise.all([
    // per-month income/expense
    Transaction.aggregate([
      { $match: { userId, isDeleted: false, date: { $gte: start, $lt: end } } },
      { $group: {
        _id: { month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      }},
      { $sort: { '_id.month': 1 } },
    ]),

    // per-category totals for the year
    Transaction.aggregate([
      { $match: { userId, isDeleted: false, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $project: {
        categoryId: '$_id',
        name:  { $ifNull: ['$cat.name', 'Unknown'] },
        icon:  { $ifNull: ['$cat.icon', '❓'] },
        color: { $ifNull: ['$cat.color', '#6b7280'] },
        total: 1,
        count: 1,
      }},
      { $sort: { total: -1 } },
    ]),
  ]);

  // Build a filled 12-month array
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const inc = monthlyTotals.find((r) => r._id.month === m && r._id.type === 'income')?.total  || 0;
    const exp = monthlyTotals.find((r) => r._id.month === m && r._id.type === 'expense')?.total || 0;
    return { month: m, income: inc, expense: exp, net: inc - exp };
  });

  const totalIncome  = months.reduce((s, m) => s + m.income,  0);
  const totalExpense = months.reduce((s, m) => s + m.expense, 0);

  return success(res, {
    year,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    months,
    byCategory: categoryTotals,
  });
});

module.exports = { getMonthlyReport, getYearlyReport };
