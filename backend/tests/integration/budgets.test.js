const request    = require('supertest');
const mongoose   = require('mongoose');
const app        = require('../../src/app');
const Budget     = require('../../src/models/Budget');
const Transaction = require('../../src/models/Transaction');
const Category   = require('../../src/models/Category');
const User       = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

let agent, user, foodCat;

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Budget.deleteMany({}), Transaction.deleteMany({}), Category.deleteMany({})]);
  await seedCategories();
  foodCat = await Category.findOne({ name: 'Food', isSystem: true });
  ({ agent, user } = await createAuthenticatedAgent(request, app));
});

const makeBody = (overrides = {}) => ({
  category:    foodCat._id.toString(),
  limitAmount: 200,
  month:       5,
  year:        2026,
  ...overrides,
});

describe('POST /api/budgets (upsert)', () => {
  it('creates a budget and returns 201', async () => {
    const res = await agent.post('/api/budgets').send(makeBody());
    expect(res.status).toBe(201);
    expect(res.body.data.limitAmount).toBe(200);
    expect(res.body.data.category.name).toBe('Food');
    expect(res.body.data.spent).toBe(0);
    expect(res.body.data.percentUsed).toBe(0);
  });

  it('updates limit when budget already exists (upsert)', async () => {
    await agent.post('/api/budgets').send(makeBody({ limitAmount: 100 }));
    const res = await agent.post('/api/budgets').send(makeBody({ limitAmount: 300 }));
    expect(res.status).toBe(201);
    expect(res.body.data.limitAmount).toBe(300);

    const count = await Budget.countDocuments({ userId: user._id });
    expect(count).toBe(1);
  });

  it('applies default alertThreshold (0.8) when not provided', async () => {
    const res = await agent.post('/api/budgets').send(makeBody());
    expect(res.status).toBe(201);
    expect(res.body.data.alertThreshold).toBe(0.8);
  });

  it('accepts custom alertThreshold', async () => {
    const res = await agent.post('/api/budgets').send(makeBody({ alertThreshold: 0.5 }));
    expect(res.status).toBe(201);
    expect(res.body.data.alertThreshold).toBe(0.5);
  });

  it('rejects missing required fields', async () => {
    const res = await agent.post('/api/budgets').send({ limitAmount: 100 });
    expect(res.status).toBe(422);
  });

  it('rejects amount <= 0', async () => {
    const res = await agent.post('/api/budgets').send(makeBody({ limitAmount: 0 }));
    expect(res.status).toBe(422);
  });
});

describe('GET /api/budgets', () => {
  it('returns budgets for current user only', async () => {
    await agent.post('/api/budgets').send(makeBody());
    const res = await agent.get(`/api/budgets?month=5&year=2026`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('uses current month/year when query params omitted', async () => {
    const res = await agent.get('/api/budgets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/budgets/summary', () => {
  it('returns adherenceRate 1 when no budgets set (totalLimit = 0)', async () => {
    const res = await agent.get('/api/budgets/summary?month=5&year=2026');
    expect(res.status).toBe(200);
    expect(res.body.data.totalLimit).toBe(0);
    expect(res.body.data.adherenceRate).toBe(1);
  });

  it('uses current month/year defaults when params omitted', async () => {
    const res = await agent.get('/api/budgets/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalLimit');
  });

  it('aggregates spending progress across categories', async () => {
    await agent.post('/api/budgets').send(makeBody({ limitAmount: 100 }));
    // Create a transaction in Food for this month
    await Transaction.create({
      userId: user._id, type: 'expense', amount: 40, amountUSD: 40,
      description: 'Groceries', category: foodCat._id,
      date: new Date('2026-05-10'),
    });

    const res = await agent.get('/api/budgets/summary?month=5&year=2026');
    expect(res.status).toBe(200);
    expect(res.body.data.totalLimit).toBe(100);
    expect(res.body.data.totalSpent).toBe(40);
    expect(res.body.data.totalRemaining).toBe(60);
    expect(res.body.data.budgets[0].percentUsed).toBeCloseTo(0.4);
  });
});

describe('GET /api/budgets/:id', () => {
  it('returns a single budget with spending enrichment', async () => {
    const created = await agent.post('/api/budgets').send(makeBody({ limitAmount: 50 }));
    const id = created.body.data._id;

    await Transaction.create({
      userId: user._id, type: 'expense', amount: 30, amountUSD: 30,
      description: 'Dinner', category: foodCat._id, date: new Date('2026-05-12'),
    });

    const res = await agent.get(`/api/budgets/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.spent).toBe(30);
    expect(res.body.data.remaining).toBe(20);
    expect(res.body.data.percentUsed).toBeCloseTo(0.6);
  });

  it('returns 404 for another user\'s budget', async () => {
    const other = await User.create({ googleId: 'g-o', email: 'o@t.com', displayName: 'O' });
    const otherBudget = await Budget.create({
      userId: other._id, category: foodCat._id,
      limitAmount: 100, month: 5, year: 2026,
    });
    const res = await agent.get(`/api/budgets/${otherBudget._id}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/budgets/:id — over-budget scenario', () => {
  it('caps percentUsed at 1 when spending exceeds limit', async () => {
    const created = await agent.post('/api/budgets').send(makeBody({ limitAmount: 50 }));
    const id = created.body.data._id;
    await Transaction.create({
      userId: user._id, type: 'expense', amount: 80, amountUSD: 80,
      description: 'Over budget', category: foodCat._id, date: new Date('2026-05-12'),
    });
    const res = await agent.get(`/api/budgets/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.percentUsed).toBe(1);
    expect(res.body.data.remaining).toBe(0);
  });
});

describe('PUT /api/budgets/:id', () => {
  it('updates limitAmount and resets alertSent', async () => {
    const created = await agent.post('/api/budgets').send(makeBody());
    const id = created.body.data._id;
    await Budget.findByIdAndUpdate(id, { alertSent: true });

    const res = await agent.put(`/api/budgets/${id}`).send({ limitAmount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.data.limitAmount).toBe(500);
    expect(res.body.data.alertSent).toBe(false);
  });

  it('updates only alertThreshold (limitAmount unchanged)', async () => {
    const created = await agent.post('/api/budgets').send(makeBody({ limitAmount: 200 }));
    const id = created.body.data._id;
    const res = await agent.put(`/api/budgets/${id}`).send({ alertThreshold: 0.6 });
    expect(res.status).toBe(200);
    expect(res.body.data.alertThreshold).toBe(0.6);
    expect(res.body.data.limitAmount).toBe(200);
  });
});

describe('DELETE /api/budgets/:id', () => {
  it('deletes the budget', async () => {
    const created = await agent.post('/api/budgets').send(makeBody());
    const id = created.body.data._id;
    const del = await agent.delete(`/api/budgets/${id}`);
    expect(del.status).toBe(200);
    expect(await Budget.findById(id)).toBeNull();
  });
});
