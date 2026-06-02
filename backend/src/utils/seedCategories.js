const Category = require('../models/Category');
const logger = require('./logger');

const SYSTEM_CATEGORIES = [
  { name: 'Food',           icon: '🍔', color: '#f59e0b' },
  { name: 'Utilities',      icon: '💡', color: '#3b82f6' },
  { name: 'Transport',      icon: '🚗', color: '#8b5cf6' },
  { name: 'Leisure',        icon: '🎮', color: '#ec4899' },
  { name: 'Health',         icon: '🏥', color: '#ef4444' },
  { name: 'Education',      icon: '📚', color: '#06b6d4' },
  { name: 'Travel',         icon: '✈️', color: '#10b981' },
  { name: 'Shopping',       icon: '🛍️', color: '#f97316' },
  { name: 'Entertainment',  icon: '🎬', color: '#a855f7' },
  { name: 'Salary',         icon: '💰', color: '#22c55e' },
  { name: 'Investment',     icon: '📈', color: '#0ea5e9' },
  { name: 'Housing',        icon: '🏠', color: '#78716c' },
  { name: 'Subscriptions',  icon: '🔄', color: '#6366f1' },
  { name: 'Other',          icon: '📦', color: '#9ca3af' },
];

const seedCategories = async () => {
  try {
    const existing = await Category.countDocuments({ isSystem: true });
    if (existing >= SYSTEM_CATEGORIES.length) return;

    const ops = SYSTEM_CATEGORIES.map((cat) => ({
      updateOne: {
        filter: { name: cat.name, isSystem: true },
        update: { $setOnInsert: { ...cat, isSystem: true, userId: null } },
        upsert: true,
      },
    }));

    const result = await Category.bulkWrite(ops);
    if (result.upsertedCount > 0) {
      logger.info(`Seeded ${result.upsertedCount} system categories`);
    }
  } catch (err) {
    logger.error('Category seed error', { message: err.message });
  }
};

module.exports = seedCategories;
