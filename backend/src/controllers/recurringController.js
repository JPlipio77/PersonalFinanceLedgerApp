const RecurringRule = require('../models/RecurringRule');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { success, created, error, paginated } = require('../utils/apiResponse');

const computeNextRunDate = (fromDate, frequency) => {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
};

const listRules = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50,  parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = { userId: req.user._id };
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [rules, total] = await Promise.all([
    RecurringRule.find(filter)
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RecurringRule.countDocuments(filter),
  ]);

  return paginated(res, rules, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getRule = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('category', 'name icon color');
  if (!rule) return error(res, 'Recurring rule not found', 404);
  return success(res, rule);
});

const createRule = asyncHandler(async (req, res) => {
  const { type, amount, currency, description, category, frequency, startDate, endDate } = req.body;

  const cat = await Category.findOne({
    _id: category,
    $or: [{ isSystem: true }, { userId: req.user._id }],
  });
  if (!cat) return error(res, 'Category not found or not accessible', 404);

  const start = startDate ? new Date(startDate) : new Date();
  const rule = await RecurringRule.create({
    userId: req.user._id,
    type,
    amount,
    currency: currency || req.user.currency || 'PHP',
    description,
    category,
    frequency,
    startDate: start,
    endDate:   endDate ? new Date(endDate) : null,
    nextRunDate: start,
  });

  const populated = await rule.populate('category', 'name icon color');
  return created(res, populated);
});

const updateRule = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.findOne({ _id: req.params.id, userId: req.user._id });
  if (!rule) return error(res, 'Recurring rule not found', 404);

  const allowed = ['type', 'amount', 'currency', 'description', 'category', 'frequency', 'startDate', 'endDate', 'isActive'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) rule[key] = req.body[key];
  });

  if (req.body.startDate || req.body.frequency) {
    rule.nextRunDate = computeNextRunDate(rule.startDate, rule.frequency);
  }

  await rule.save();
  const populated = await rule.populate('category', 'name icon color');
  return success(res, populated);
});

const deleteRule = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!rule) return error(res, 'Recurring rule not found', 404);
  return success(res, null, 'Recurring rule deleted');
});

module.exports = { listRules, getRule, createRule, updateRule, deleteRule };
