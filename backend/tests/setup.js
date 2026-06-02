const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async () => {
  // Windows MongoDB startup can be slow; give it 60 seconds
  mongod = await MongoMemoryServer.create({
    instance: {
      startupTimeoutMS: 60000,
    },
  });

  const uri = mongod.getUri();

  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-secret-for-jest';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  // Dummy OAuth creds so passport strategy initialises without throwing
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';

  global.__MONGOD__ = mongod;
};
