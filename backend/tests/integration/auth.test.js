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

// ── Local auth endpoints ──────────────────────────────────────────────────────

jest.mock('../../src/services/emailService', () => ({
  sendBudgetAlert:   jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}));
const { sendPasswordReset } = require('../../src/services/emailService');

describe('POST /api/auth/register', () => {
  it('creates a new user and returns session', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'local@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('local@test.com');
    expect(res.body.data.password).toBeUndefined();
  });

  it('returns 409 when email is already taken', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@test.com', password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'logintest@test.com', password: 'password123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'logintest@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('logintest@test.com');
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'logintest@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 and calls sendPasswordReset for valid local user', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'forgot@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@test.com' });
    expect(res.status).toBe(200);
    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('returns 200 even for unknown email (prevents enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@nowhere.com' });
    expect(res.status).toBe(200);
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  it('sends reset email for Google-only account (no local password)', async () => {
    // Simulate a Google OAuth user who has no local password
    const User = require('../../src/models/User');
    await User.create({ googleId: 'g-oauth-only', email: 'googleonly@test.com', displayName: 'Google User' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'googleonly@test.com' });
    expect(res.status).toBe(200);
    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('returns 400 for invalid or expired token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', password: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when token or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ password: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when new password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'some-token', password: 'short' });
    expect(res.status).toBe(400);
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
