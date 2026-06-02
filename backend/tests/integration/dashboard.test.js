const request     = require('supertest');
const mongoose    = require('mongoose');
const app         = require('../../src/app');
const Transaction = require('../../src/models/Transaction');
const Budget      = require('../../src/models/Budget');
const Category    = require('../../src/models/Category');
const User        = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

let agent, user, foodCat, travelCat;

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}), Transaction.deleteMany({}),
    Budget.deleteMany({}), Category.deleteMany({}),
  ]);
  await seedCategories();
  [foodCat, travelCat] = await Promise.all([
    Category.findOne({ name: 'Food',   isSystem: true }),
    Category.findOne({ name: 'Travel', isSystem: true }),
  ]);
  ({ agent, user } = await createAuthenticatedAgent(request, app));
});

// ─── seed helpers ────────────────────────────────────────────────────────────

const tx = (overrides) => ({
  userId: user._id,
  type:   'expense',
  amount: 50,
  amountUSD: 50,
  description: 'Test',
  category: foodCat._id,
  isDeleted: false,
  ...overrides,
});

const MAY = (day) => new Date(`2026-05-${String(day).padStart(2, '0')}`);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/dashboard/overview', () => {
  it('returns zeros when no transactions exist', async () => {
    const res = await agent.get('/api/dashboard/overview?month=5&year=2026');
    expect(res.status).toBe(200);
    expect(res.body.data.income).toBe(0);
    expect(res.body.data.expense).toBe(0);
    expect(res.body.data.net).toBe(0);
    expect(res.body.data.adherenceRate).toBe(1);
  });

  it('computes income, expense and net correctly', async () => {
    await Transaction.insertMany([
      tx({ type: 'expense', amount: 100, amountUSD: 100, date: MAY(5) }),
      tx({ type: 'expense', amount:  40, amountUSD:  40, date: MAY(10) }),
      tx({ type: 'income',  amount: 500, amountUSD: 500, date: MAY(15) }),
    ]);
    const res = await agent.get('/api/dashboard/overview?month=5&year=2026');
    expect(res.body.data.expense).toBe(140);
    expect(res.body.data.income).toBe(500);
    expect(res.body.data.net).toBe(360);
    expect(res.body.data.transactionCount).toBe(3);
  });

  it('does not include transactions from other months', async () => {
    await Transaction.insertMany([
      tx({ amount: 200, amountUSD: 200, date: MAY(1) }),           // May
      tx({ amount: 999, amountUSD: 999, date: new Date('2026-04-30') }), // April — excluded
    ]);
    const res = await agent.get('/api/dashboard/overview?month=5&year=2026');
    expect(res.body.data.expense).toBe(200);
  });

  it('does not include soft-deleted transactions', async () => {
    await Transaction.insertMany([
      tx({ amount: 50, amountUSD: 50, date: MAY(5) }),
      tx({ amount: 99, amountUSD: 99, date: MAY(6), isDeleted: true }),
    ]);
    const res = await agent.get('/api/dashboard/overview?month=5&year=2026');
    expect(res.body.data.expense).toBe(50);
  });

  it('computes budget adherence rate', async () => {
    // Budget of 100 for Food; we spend 80 — within limit → adherence 1.0
    await Budget.create({ userId: user._id, category: foodCat._id, limitAmount: 100, month: 5, year: 2026 });
    await Transaction.create(tx({ amount: 80, amountUSD: 80, date: MAY(10) }));
    const res = await agent.get('/api/dashboard/overview?month=5&year=2026');
    expect(res.body.data.adherenceRate).toBe(1);
  });

  it('adherence < 1 when a budget is exceeded', async () => {
    // Two budgets; one exceeded, one fine → 0.5
    await Budget.create({ userId: user._id, category: foodCat._id,   limitAmount: 50,  month: 5, year: 2026 });
    await Budget.create({ userId: user._id, category: travelCat._id, limitAmount: 500, month: 5, year: 2026 });
    await Transaction.insertMany([
      tx({ category: foodCat._id,   amount: 100, amountUSD: 100, date: MAY(5) }), // over
      tx({ category: travelCat._id, amount:  50, amountUSD:  50, date: MAY(5) }), // fine
    ]);
    const res = await agent.get('/api/dashboard/overview?month=5&year=2026');
    expect(res.body.data.adherenceRate).toBeCloseTo(0.5);
  });
});

describe('GET /api/dashboard/recent-transactions', () => {
  it('returns latest transactions in descending date order', async () => {
    await Transaction.insertMany([
      tx({ description: 'Oldest', date: MAY(1) }),
      tx({ description: 'Middle', date: MAY(10) }),
      tx({ description: 'Newest', date: MAY(20) }),
    ]);
    const res = await agent.get('/api/dashboard/recent-transactions');
    expect(res.status).toBe(200);
    expect(res.body.data[0].description).toBe('Newest');
    expect(res.body.data[2].description).toBe('Oldest');
  });

  it('respects the limit query param', async () => {
    await Transaction.insertMany(
      Array.from({ length: 15 }, (_, i) => tx({ description: `T${i}`, date: MAY(1) }))
    );
    const res = await agent.get('/api/dashboard/recent-transactions?limit=5');
    expect(res.body.data.length).toBe(5);
  });

  it('excludes soft-deleted transactions', async () => {
    await Transaction.create(tx({ description: 'Deleted', isDeleted: true, date: MAY(5) }));
    const res = await agent.get('/api/dashboard/recent-transactions');
    expect(res.body.data.every(t => t.description !== 'Deleted')).toBe(true);
  });
});

describe('GET /api/dashboard/spending-by-category', () => {
  it('returns spending grouped and sorted by total descending', async () => {
    await Transaction.insertMany([
      tx({ category: foodCat._id,   amount:  80, amountUSD:  80, date: MAY(5) }),
      tx({ category: foodCat._id,   amount:  20, amountUSD:  20, date: MAY(6) }),
      tx({ category: travelCat._id, amount: 200, amountUSD: 200, date: MAY(7) }),
    ]);
    const res = await agent.get('/api/dashboard/spending-by-category?month=5&year=2026');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].name).toBe('Travel');   // 200 — highest
    expect(res.body.data[0].total).toBe(200);
    expect(res.body.data[1].name).toBe('Food');     // 100
    expect(res.body.data[1].total).toBe(100);
  });

  it('excludes income transactions', async () => {
    await Transaction.insertMany([
      tx({ type: 'expense', amount: 50, amountUSD: 50, date: MAY(1) }),
      tx({ type: 'income',  amount: 500, amountUSD: 500, category: foodCat._id, date: MAY(2) }),
    ]);
    const res = await agent.get('/api/dashboard/spending-by-category?month=5&year=2026');
    const names = res.body.data.map(d => d.total);
    expect(names).not.toContain(500);
  });

  it('returns empty array when no expense transactions', async () => {
    const res = await agent.get('/api/dashboard/spending-by-category?month=5&year=2026');
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/dashboard/trend', () => {
  it('returns one entry per month for the requested range', async () => {
    const res = await agent.get('/api/dashboard/trend?months=3');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
  });

  it('fills zero-activity months with zeros', async () => {
    const res = await agent.get('/api/dashboard/trend?months=6');
    expect(res.body.data.every(m => typeof m.income === 'number' && typeof m.expense === 'number')).toBe(true);
  });

  it('correctly accumulates income and expense per month', async () => {
    const now = new Date();
    const midMonth = new Date(now.getFullYear(), now.getMonth(), 15);
    await Transaction.insertMany([
      tx({ type: 'expense', amount:  60, amountUSD:  60, date: midMonth }),
      tx({ type: 'income',  amount: 300, amountUSD: 300, date: midMonth }),
    ]);
    const res = await agent.get('/api/dashboard/trend?months=1');
    const entry = res.body.data[0];
    expect(entry.expense).toBe(60);
    expect(entry.income).toBe(300);
  });
});
