require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const seedCategories = require('./src/utils/seedCategories');
const logger = require('./src/utils/logger');
const { startCronJobs } = require('./src/jobs/recurringTransactions');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await seedCategories();
  startCronJobs();
  app.listen(PORT, () => {
    logger.info(`Backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exitCode = 1;
});
