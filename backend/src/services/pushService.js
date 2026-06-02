const webpush = require('web-push');
const logger = require('../utils/logger');

const initWebPush = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_MAILTO || 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
};

const sendBudgetAlert = async ({ subscription, category, budget, spent }) => {
  if (!subscription?.endpoint) {
    logger.debug('Push alert skipped: no push subscription');
    return;
  }
  const percent   = Math.round((spent / budget.limitAmount) * 100);
  const remaining = Math.max(0, budget.limitAmount - spent).toFixed(2);
  const payload   = JSON.stringify({
    title: `⚠️ ${category.name} budget ${percent}% used`,
    body:  `${budget.currency} ${remaining} remaining this month`,
    url:   '/budgets',
  });
  try {
    await webpush.sendNotification(subscription, payload);
    logger.info(`Push alert sent for category ${category.name}`);
  } catch (err) {
    // 410 Gone means the subscription is no longer valid
    if (err.statusCode === 410) {
      logger.info('Push subscription expired (410) — should be removed');
      throw Object.assign(err, { expired: true });
    }
    logger.error('Failed to send push notification', { message: err.message });
  }
};

module.exports = { initWebPush, sendBudgetAlert };
