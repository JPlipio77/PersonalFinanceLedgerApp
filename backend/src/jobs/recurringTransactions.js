const cron = require('node-cron');
const RecurringRule = require('../models/RecurringRule');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const logger = require('../utils/logger');
const currencyService = require('../services/currencyService');

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

/**
 * Creates transactions for all active recurring rules whose nextRunDate is today or in the past.
 * Called by the daily cron job.
 */
const processRecurringTransactions = async () => {
  const now = new Date();
  const rules = await RecurringRule.find({
    isActive: true,
    nextRunDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  }).lean();

  if (!rules.length) return;
  logger.info(`Processing ${rules.length} recurring rule(s)`);

  const results = await Promise.allSettled(
    rules.map(async (rule) => {
      const amountUSD = await currencyService.convertToUSD(rule.amount, rule.currency);
      await Transaction.create({
        userId:      rule.userId,
        type:        rule.type,
        amount:      rule.amount,
        currency:    rule.currency,
        amountUSD,
        description: rule.description,
        category:    rule.category,
        date:        now,
        isRecurring: true,
        recurringId: rule._id,
      });

      await RecurringRule.findByIdAndUpdate(rule._id, {
        nextRunDate: computeNextRunDate(rule.nextRunDate, rule.frequency),
      });
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    failed.forEach((r) => logger.error('Recurring transaction failed', { reason: r.reason?.message }));
  }
  logger.info(`Recurring: ${results.length - failed.length} created, ${failed.length} failed`);
};

/**
 * Resets alertSent on all budgets at the start of a new month.
 * Called by the monthly cron job.
 */
const resetMonthlyAlerts = async () => {
  const result = await Budget.updateMany({}, { alertSent: false });
  logger.info(`Monthly alert reset: ${result.modifiedCount} budget(s) reset`);
};

const startCronJobs = () => {
  // Daily at 00:05 — process recurring transactions
  cron.schedule('5 0 * * *', async () => {
    logger.info('Cron: processing recurring transactions');
    try { await processRecurringTransactions(); }
    catch (err) { logger.error('Cron: recurring job failed', { message: err.message }); }
  });

  // First of every month at 00:01 — reset budget alert flags
  cron.schedule('1 0 1 * *', async () => {
    logger.info('Cron: resetting monthly budget alerts');
    try { await resetMonthlyAlerts(); }
    catch (err) { logger.error('Cron: monthly reset failed', { message: err.message }); }
  });

  logger.info('Cron jobs registered');
};

module.exports = { startCronJobs, processRecurringTransactions, resetMonthlyAlerts };
