const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');
const pushService  = require('./pushService');
const logger = require('../utils/logger');

/**
 * Called fire-and-forget after every expense transaction is saved.
 * Checks whether the user's budget for the transaction's category has
 * hit its alertThreshold, and if so sends email + push once per month.
 */
const checkBudgetThreshold = async (userArg, category, transaction) => {
  try {
    const now   = new Date(transaction.date || Date.now());
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    // Skip non-expense transactions
    if (transaction.type !== 'expense') return;

    const budget = await Budget.findOne({
      userId:   userArg._id,
      category: category._id,
      month,
      year,
    });
    if (!budget || budget.alertSent) return;

    // Aggregate total spending in this category this month
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);
    const [agg] = await Transaction.aggregate([
      {
        $match: {
          userId:    userArg._id,
          category:  category._id,
          type:      'expense',
          isDeleted: false,
          date:      { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountUSD' } } },
    ]);
    const spent = agg?.total || 0;
    const percent = spent / budget.limitAmount;

    if (percent < budget.alertThreshold) return;

    // Mark as sent to prevent duplicates within the same month
    await Budget.findByIdAndUpdate(budget._id, { alertSent: true });

    // Fetch full user (we may only have a lean object from session)
    const user = await User.findById(userArg._id).lean();
    if (!user) return;

    const alertPayload = { user, category, budget, spent };

    // Create in-app notification
    await Notification.create({
      userId:          user._id,
      type:            'budget_alert',
      channel:         'in_app',
      title:           `${category.name} budget ${Math.round(percent * 100)}% used`,
      message:         `You have spent ${budget.currency} ${spent.toFixed(2)} of your ${budget.currency} ${budget.limitAmount.toFixed(2)} ${category.name} budget.`,
      relatedBudget:   budget._id,
      relatedCategory: category._id,
    });

    // Email alert (if opted in and SMTP configured)
    if (user.emailAlerts) {
      await emailService.sendBudgetAlert(alertPayload);
    }

    // Push notification (if opted in and subscription exists)
    if (user.pushAlerts && user.pushSubscription?.endpoint) {
      try {
        await pushService.sendBudgetAlert({
          subscription: user.pushSubscription,
          ...alertPayload,
        });
      } catch (pushErr) {
        // If push subscription is expired, clear it from the user
        if (pushErr.expired) {
          await User.findByIdAndUpdate(user._id, { $unset: { pushSubscription: '' } });
        }
      }
    }

    logger.info(`Budget alert dispatched for user=${user._id} category=${category.name} month=${month}/${year}`);
  } catch (err) {
    // Alert errors must never propagate — they are fire-and-forget side effects
    logger.error('alertService error', { message: err.message });
  }
};

module.exports = { checkBudgetThreshold };
