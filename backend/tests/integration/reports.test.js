const request = require('supertest');
const app = require('../../src/app');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const Category = require('../../src/models/Category');
const Transaction = require('../../src/models/Transaction');
const Budget = require('../../src/models/Budget');
const User = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');

beforeAll(() => connectTestDB());
afterAll(() => disconnectTestDB());
afterEach(async () => {
  await Transaction.deleteMany({});
  await Budget.deleteMany({});
  await User.deleteMany({});
});

const THIS_MONTH = new Date().getMonth() + 1;
const THIS_YEAR  = new Date().getFullYear();

const txDate = (month = THIS_MONTH, year = THIS_YEAR) =>
  new Date(year, month - 1, 15).toISOString();

describe('Reports API', () => {
  let agent, user, category;

  beforeEach(async () => {
    await Category.deleteMany({});
    await seedCategories();
    category = await Category.findOne({ isSystem: true }).lean();
    ({ agent, user } = await createAuthenticatedAgent(request, app));
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/reports/monthly');
    expect(res.status).toBe(401);
  });

  it('GET /monthly returns zeros for empty ledger', async () => {
    const res = await agent.get(`/api/reports/monthly?month=${THIS_MONTH}&year=${THIS_YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data.income).toBe(0);
    expect(res.body.data.expense).toBe(0);
    expect(res.body.data.net).toBe(0);
    expect(res.body.data.byCategory).toHaveLength(0);
  });

  it('GET /monthly returns correct income and expense totals', async () => {
    await Transaction.create([
      { userId: user._id, type: 'income',  amount: 3000, currency: 'USD', amountUSD: 3000, description: 'Salary', category: category._id, date: txDate() },
      { userId: user._id, type: 'expense', amount: 500,  currency: 'USD', amountUSD: 500,  description: 'Rent',   category: category._id, date: txDate() },
      { userId: user._id, type: 'expense', amount: 200,  currency: 'USD', amountUSD: 200,  description: 'Food',   category: category._id, date: txDate() },
    ]);

    const res = await agent.get(`/api/reports/monthly?month=${THIS_MONTH}&year=${THIS_YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data.income).toBe(3000);
    expect(res.body.data.expense).toBe(700);
    expect(res.body.data.net).toBe(2300);
    expect(res.body.data.transactionCount).toBe(3);
  });

  it('GET /monthly returns category breakdown', async () => {
    await Transaction.create([
      { userId: user._id, type: 'expense', amount: 400, currency: 'USD', amountUSD: 400, description: 'Bills', category: category._id, date: txDate() },
    ]);
    const res = await agent.get(`/api/reports/monthly?month=${THIS_MONTH}&year=${THIS_YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data.byCategory).toHaveLength(1);
    expect(res.body.data.byCategory[0].total).toBe(400);
  });

  it('GET /monthly includes enriched budget data', async () => {
    await Transaction.create({
      userId: user._id, type: 'expense', amount: 300, currency: 'USD', amountUSD: 300,
      description: 'Groceries', category: category._id, date: txDate(),
    });
    await Budget.create({
      userId: user._id, category: category._id, limitAmount: 500,
      currency: 'USD', month: THIS_MONTH, year: THIS_YEAR,
    });
    const res = await agent.get(`/api/reports/monthly?month=${THIS_MONTH}&year=${THIS_YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data.budgets).toHaveLength(1);
    expect(res.body.data.budgets[0].spent).toBe(300);
    expect(res.body.data.budgets[0].percentUsed).toBe(60);
  });

  it('GET /monthly validates month range', async () => {
    const res = await agent.get('/api/reports/monthly?month=13&year=2026');
    expect(res.status).toBe(422);
  });

  it('GET /monthly excludes soft-deleted transactions', async () => {
    await Transaction.create({
      userId: user._id, type: 'expense', amount: 999, currency: 'USD', amountUSD: 999,
      description: 'Deleted tx', category: category._id, date: txDate(), isDeleted: true,
    });
    const res = await agent.get(`/api/reports/monthly?month=${THIS_MONTH}&year=${THIS_YEAR}`);
    expect(res.body.data.expense).toBe(0);
  });

  it('GET /yearly returns 12 months', async () => {
    const res = await agent.get(`/api/reports/yearly?year=${THIS_YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data.months).toHaveLength(12);
  });

  it('GET /yearly sums transactions across the year', async () => {
    await Transaction.create([
      { userId: user._id, type: 'income',  amount: 2000, currency: 'USD', amountUSD: 2000, description: 'Jan salary', category: category._id, date: new Date(THIS_YEAR, 0, 15) },
      { userId: user._id, type: 'income',  amount: 2000, currency: 'USD', amountUSD: 2000, description: 'Feb salary', category: category._id, date: new Date(THIS_YEAR, 1, 15) },
      { userId: user._id, type: 'expense', amount: 300,  currency: 'USD', amountUSD: 300,  description: 'Food',       category: category._id, date: new Date(THIS_YEAR, 0, 20) },
    ]);
    const res = await agent.get(`/api/reports/yearly?year=${THIS_YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalIncome).toBe(4000);
    expect(res.body.data.totalExpense).toBe(300);
    expect(res.body.data.net).toBe(3700);
  });
});
