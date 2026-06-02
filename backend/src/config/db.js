const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_ledger';
  await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
