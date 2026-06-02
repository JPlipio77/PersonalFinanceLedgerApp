const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { success, created, error, paginated } = require('../utils/apiResponse');
const currencyService = require('../services/currencyService');

// ─── Helpers ────────────────────────────────────────────────────────────────

const buildFilter = (userId, query) => {
  const filter = { userId, isDeleted: false };

  if (query.type) filter.type = query.type;

  if (query.category) {
    if (mongoose.isValidObjectId(query.category)) {
      filter.category = query.category;
    }
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate)   filter.date.$lte = new Date(query.endDate);
  }

  if (query.search) {
    filter.description = { $regex: query.search, $options: 'i' };
  }

  return filter;
};

// ─── Controllers ────────────────────────────────────────────────────────────

const listTransactions = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = buildFilter(req.user._id, req.query);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('category', 'name icon color')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return paginated(res, transactions, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: false,
  }).populate('category', 'name icon color');

  if (!tx) return error(res, 'Transaction not found', 404);
  return success(res, tx);
});

const createTransaction = asyncHandler(async (req, res) => {
  const { type, amount, currency, description, category, date } = req.body;

  // Verify the category belongs to this user or is a system category
  const cat = await Category.findOne({
    _id: category,
    $or: [{ isSystem: true }, { userId: req.user._id }],
  });
  if (!cat) return error(res, 'Category not found or not accessible', 404);

  const txCurrency = currency || req.user.currency || 'PHP';
  const amountUSD  = await currencyService.convertToUSD(amount, txCurrency);

  const tx = await Transaction.create({
    userId: req.user._id,
    type,
    amount,
    currency: txCurrency,
    amountUSD,
    description,
    category,
    date: date || new Date(),
  });

  const populated = await tx.populate('category', 'name icon color');

  // Fire budget alert check asynchronously (Phase 4 wires this)
  if (type === 'expense') {
    Promise.resolve().then(async () => {
      try {
        const alertService = require('../services/alertService');
        await alertService.checkBudgetThreshold(req.user, cat, tx);
      } catch (_) { /* alert failures must not affect the response */ }
    });
  }

  return created(res, populated);
});

const updateTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: false,
  });
  if (!tx) return error(res, 'Transaction not found', 404);

  const allowed = ['type', 'amount', 'currency', 'description', 'category', 'date'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) tx[key] = req.body[key];
  });
  if (req.body.amount !== undefined) {
    tx.amountUSD = await currencyService.convertToUSD(
      req.body.amount,
      req.body.currency || tx.currency
    );
  }

  await tx.save();
  const populated = await tx.populate('category', 'name icon color');
  return success(res, populated);
});

const deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: false,
  });
  if (!tx) return error(res, 'Transaction not found', 404);

  tx.isDeleted = true;
  tx.deletedAt = new Date();
  await tx.save();
  return success(res, null, 'Transaction deleted');
});

const restoreTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: true,
  });
  if (!tx) return error(res, 'Deleted transaction not found', 404);

  tx.isDeleted = false;
  tx.deletedAt = null;
  await tx.save();
  const populated = await tx.populate('category', 'name icon color');
  return success(res, populated, 'Transaction restored');
});

const exportTransactions = asyncHandler(async (req, res) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  const filter = buildFilter(req.user._id, req.query);

  const transactions = await Transaction.find(filter)
    .populate('category', 'name')
    .sort({ date: -1 })
    .lean();

  const exportService = require('../services/exportService');
  const { buffer, contentType, filename } = await exportService.exportTransactions(
    transactions,
    format
  );

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
  exportTransactions,
};
