const mongoose = require('mongoose');
const User = require('../../src/models/User');

/**
 * Creates a real User document and returns a supertest agent that holds
 * a server-side session for that user. This lets integration tests hit
 * protected routes without going through Google OAuth.
 */
const createAuthenticatedAgent = async (request, app) => {
  const agent = request.agent(app);

  const user = await User.create({
    googleId: `test-google-${new mongoose.Types.ObjectId()}`,
    email: `test-${Date.now()}@example.com`,
    displayName: 'Test User',
    avatar: null,
  });

  // Use the test-login shortcut wired into the app during tests
  await agent.post('/api/auth/test-login').send({ userId: user._id.toString() });

  return { agent, user };
};

module.exports = { createAuthenticatedAgent };
