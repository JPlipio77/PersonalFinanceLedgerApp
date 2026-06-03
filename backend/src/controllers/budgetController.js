const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { success, created, error } = require('../utils/apiResponse');

// ─── Helpers ────────────────────────────────────────────────────────────────

const getSpentAmount = async (userId, categoryId, month, year) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);
  const [agg] = await Transaction.aggregate([
    {
      $match: {
        userId,
        category: categoryId,
        type: 'expense',
        isDeleted: false,
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: null, total: { $sum: '$amountUSD' } } },
  ]);
  return agg?.total || 0;
};

const enrichBudget = async (budget) => {
  const spent = await getSpentAmount(
    budget.userId,
    budget.category._id || budget.category,
    budget.month,
    budget.year
  );
  const plain = budget.toObject();
  return {
    ...plain,
    spent,
    remaining: Math.max(0, plain.limitAmount - spent),
    percentUsed: plain.limitAmount > 0 ? Math.min(1, spent / plain.limitAmount) : 0,
  };
};

// ─── Controllers ────────────────────────────────────────────────────────────

const listBudgets = asyncHandler(async (req, res) => {
  const now   = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year  = parseInt(req.query.year)  || now.getFullYear();

  const budgets = await Budget.find({ userId: req.user._id, month, year })
    .populate('category', 'name icon color');

  const enriched = await Promise.all(budgets.map(enrichBudget));
  return success(res, enriched);
});

const getBudgetSummary = asyncHandler(async (req, res) => {
  const now   = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year  = parseInt(req.query.year)  || now.getFullYear();

  const budgets  = await Budget.find({ userId: req.user._id, month, year });
  const enriched = await Promise.all(budgets.map(enrichBudget));

  const totalLimit = enriched.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = enriched.reduce((s, b) => s + b.spent, 0);

  return success(res, {
    month, year,
    totalLimit,
    totalSpent,
    totalRemaining: Math.max(0, totalLimit - totalSpent),
    adherenceRate:  totalLimit > 0 ? Math.min(1, 1 - totalSpent / totalLimit) : 1,
    budgets:        enriched,
  });
});

const getBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('category', 'name icon color');
  if (!budget) return error(res, 'Budget not found', 404);
  return success(res, await enrichBudget(budget));
});

const upsertBudget = asyncHandler(async (req, res) => {
  const now   = new Date();
  const { category, limitAmount, alertThreshold, currency } = req.body;
  const month = parseInt(req.body.month) || now.getMonth() + 1;
  const year  = parseInt(req.body.year)  || now.getFullYear();

  // Verify accessible category
  const cat = await Category.findOne({
    _id: category,
    $or: [{ isSystem: true }, { userId: req.user._id }],
  });
  if (!cat) return error(res, 'Category not found', 404);

  const budget = await Budget.findOneAndUpdate(
    { userId: req.user._id, category, month, year },
    {
      $set: {
        limitAmount,
        alertThreshold: alertThreshold ?? 0.8,
        currency: currency || req.user.currency || 'PHP',
        alertSent: false,   // reset alert when limit is changed
      },
    },
    { upsert: true, new: true, runValidators: true }
  ).populate('category', 'name icon color');

  const enriched = await enrichBudget(budget);
  return created(res, enriched);
});

const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
  if (!budget) return error(res, 'Budget not found', 404);

  const { limitAmount, alertThreshold } = req.body;
  if (limitAmount    !== undefined) budget.limitAmount    = limitAmount;
  if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;
  budget.alertSent = false;
  await budget.save();

  const populated = await budget.populate('category', 'name icon color');
  return success(res, await enrichBudget(populated));
});

const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!budget) return error(res, 'Budget not found', 404);
  return success(res, null, 'Budget deleted');
});

module.exports = {
  listBudgets, getBudgetSummary, getBudget,
  upsertBudget, updateBudget, deleteBudget,
};
