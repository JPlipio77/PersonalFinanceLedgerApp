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

describe('POST /api/auth/register', () => {
  it('creates a new local user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'newuser@test.com',
      username: 'newuser',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
      birthday: '1990-01-01',
      country: 'Philippines',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('newuser@test.com');
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.authProvider).toBe('local');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dup@test.com', username: 'dupuser1', password: 'StrongPass1!', confirmPassword: 'StrongPass1!',
    });
    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@test.com', username: 'dupuser2', password: 'StrongPass1!', confirmPassword: 'StrongPass1!',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'mismatch@test.com', username: 'mismatch', password: 'StrongPass1!', confirmPassword: 'Different1!',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@test.com', username: 'shortpw', password: 'abc', confirmPassword: 'abc',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'no-pass@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'loginuser@test.com',
      username: 'loginuser',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
    });
  });

  it('returns 200 with valid credentials (email)', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({
      identifier: 'loginuser@test.com', password: 'StrongPass1!',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('loginuser@test.com');
    expect(res.body.data.password).toBeUndefined();
  });

  it('returns 200 with valid credentials (username)', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({
      identifier: 'loginuser', password: 'StrongPass1!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('loginuser@test.com');
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'loginuser@test.com', password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with non-existent identifier', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'nobody@test.com', password: 'StrongPass1!',
    });
    expect(res.status).toBe(401);
  });

  it('establishes a session after login', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ identifier: 'loginuser@test.com', password: 'StrongPass1!' });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('loginuser@test.com');
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'forgot@test.com', username: 'forgotuser', password: 'StrongPass1!', confirmPassword: 'StrongPass1!',
    });
  });

  it('returns 200 for existing local user and exposes _devToken in test env', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'forgot@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._devToken).toBeDefined();
  });

  it('returns 200 even for non-existent email (no enumeration)', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password/:token', () => {
  let resetToken;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'reset@test.com', username: 'resetuser', password: 'OldPass1!', confirmPassword: 'OldPass1!',
    });
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'reset@test.com' });
    resetToken = forgot.body.data._devToken;
  });

  it('resets the password with a valid token', async () => {
    const res = await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'NewPass2!', confirmPassword: 'NewPass2!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows login with the new password after reset', async () => {
    await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'NewPass2!', confirmPassword: 'NewPass2!' });

    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ identifier: 'reset@test.com', password: 'NewPass2!' });
    expect(res.status).toBe(200);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password/invalidtoken')
      .send({ password: 'NewPass2!', confirmPassword: 'NewPass2!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'NewPass2!', confirmPassword: 'DifferentPass!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when new password is too short', async () => {
    const res = await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'short', confirmPassword: 'short' });
    expect(res.status).toBe(400);
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
