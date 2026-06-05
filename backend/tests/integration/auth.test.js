const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });
beforeEach(async () => { await User.deleteMany({}); });

describe('GET /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns the current user when authenticated', async () => {
    const { agent, user } = await createAuthenticatedAgent(request, app);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.displayName).toBe('Test User');
  });
});

describe('PUT /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).put('/api/auth/me').send({ currency: 'EUR' });
    expect(res.status).toBe(401);
  });

  it('updates allowed user fields', async () => {
    const { agent } = await createAuthenticatedAgent(request, app);
    const res = await agent
      .put('/api/auth/me')
      .send({ currency: 'EUR', timezone: 'Asia/Manila', emailAlerts: false });

    expect(res.status).toBe(200);
    expect(res.body.data.currency).toBe('EUR');
    expect(res.body.data.timezone).toBe('Asia/Manila');
    expect(res.body.data.emailAlerts).toBe(false);
  });

  it('ignores fields not in the allowed list', async () => {
    const { agent, user } = await createAuthenticatedAgent(request, app);
    await agent.put('/api/auth/me').send({ googleId: 'hacked', email: 'hacked@evil.com' });

    const dbUser = await User.findById(user._id).lean();
    expect(dbUser.googleId).toBe(user.googleId);
    expect(dbUser.email).toBe(user.email);
  });
});

describe('POST /api/auth/logout', () => {
  it('destroys the session', async () => {
    const { agent } = await createAuthenticatedAgent(request, app);

    // Confirm logged in
    const before = await agent.get('/api/auth/me');
    expect(before.status).toBe(200);

    // Logout
    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    // Now unauthenticated
    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });
});

describe('GET /api/auth/google', () => {
  it('redirects to Google OAuth', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
  });
});

describe('User model', () => {
  it('creates a user with default currency and timezone', async () => {
    const user = await User.create({
      googleId: 'g-123',
      email: 'newuser@example.com',
      displayName: 'New User',
    });
    expect(user.currency).toBe('PHP');
    expect(user.timezone).toBe('UTC');
    expect(user.emailAlerts).toBe(true);
    expect(user.pushAlerts).toBe(true);
  });

  it('enforces unique email constraint', async () => {
    await User.create({ googleId: 'g-1', email: 'dup@example.com', displayName: 'A' });
    await expect(
      User.create({ googleId: 'g-2', email: 'dup@example.com', displayName: 'B' })
    ).rejects.toThrow(/duplicate key/i);
  });
});

describe('Category seed', () => {
  it('seeds system categories on first run', async () => {
    const Category = require('../../src/models/Category');
    await Category.deleteMany({});
    const seed = require('../../src/utils/seedCategories');
    await seed();
    const count = await Category.countDocuments({ isSystem: true });
    expect(count).toBe(14);
  });

  it('is idempotent — running seed twice does not duplicate categories', async () => {
    const Category = require('../../src/models/Category');
    await Category.deleteMany({});
    const seed = require('../../src/utils/seedCategories');
    await seed();
    await seed();
    const count = await Category.countDocuments({ isSystem: true });
    expect(count).toBe(14);
  });
});
