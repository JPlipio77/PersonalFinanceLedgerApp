const mongoose = require('mongoose');

const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
};

const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

module.exports = { connectTestDB, disconnectTestDB };
