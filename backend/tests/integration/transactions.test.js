const request = require('supertest');
const app = require('../../src/app');
const Transaction = require('../../src/models/Transaction');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

let agent, user, foodCat;

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Transaction.deleteMany({}), Category.deleteMany({})]);
  await seedCategories();
  foodCat = await Category.findOne({ name: 'Food', isSystem: true });
  ({ agent, user } = await createAuthenticatedAgent(request, app));
});

const makeTx = (overrides = {}) => ({
  type: 'expense',
  amount: 25.50,
  description: 'Lunch',
  category: foodCat._id.toString(),
  date: new Date().toISOString(),
  ...overrides,
});

describe('POST /api/transactions', () => {
  it('creates a transaction and returns 201', async () => {
    const res = await agent.post('/api/transactions').send(makeTx());
    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe('Lunch');
    expect(res.body.data.category.name).toBe('Food');
    expect(res.body.data.amountUSD).toBe(25.50);
  });

  it('rejects missing required fields', async () => {
    const res = await agent.post('/api/transactions').send({ type: 'expense' });
    expect(res.status).toBe(422);
  });

  it('rejects amount <= 0', async () => {
    const res = await agent.post('/api/transactions').send(makeTx({ amount: 0 }));
    expect(res.status).toBe(422);
  });

  it('rejects invalid category ID', async () => {
    const res = await agent.post('/api/transactions').send(makeTx({ category: 'not-an-id' }));
    expect(res.status).toBe(422);
  });

  it('rejects inaccessible category', async () => {
    const otherUser = await User.create({ googleId: 'g-x', email: 'x@t.com', displayName: 'X' });
    const privateCat = await Category.create({ name: 'Private', userId: otherUser._id, isSystem: false });
    const res = await agent.post('/api/transactions').send(makeTx({ category: privateCat._id.toString() }));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/transactions', () => {
  beforeEach(async () => {
    await Transaction.insertMany([
      { userId: user._id, type: 'expense', amount: 10, amountUSD: 10, description: 'A', category: foodCat._id, date: new Date('2026-01-05') },
      { userId: user._id, type: 'expense', amount: 20, amountUSD: 20, description: 'B', category: foodCat._id, date: new Date('2026-01-10') },
      { userId: user._id, type: 'income',  amount: 100, amountUSD: 100, description: 'Salary', category: foodCat._id, date: new Date('2026-01-15') },
    ]);
  });

  it('returns paginated list', async () => {
    const res = await agent.get('/api/transactions?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.pages).toBe(2);
  });

  it('filters by type', async () => {
    const res = await agent.get('/api/transactions?type=income');
    expect(res.body.data.every((t) => t.type === 'income')).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('filters by date range', async () => {
    const res = await agent.get('/api/transactions?startDate=2026-01-08&endDate=2026-01-12');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].description).toBe('B');
  });

  it('filters by search term', async () => {
    const res = await agent.get('/api/transactions?search=salary');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].description).toBe('Salary');
  });

  it('filter by category accepts a valid ObjectId', async () => {
    const res = await agent.get(`/api/transactions?category=${foodCat._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t) => t.category.name === 'Food')).toBe(true);
  });

  it('filter by category ignores invalid ObjectId (no crash)', async () => {
    const res = await agent.get('/api/transactions?category=not-a-valid-id');
    expect(res.status).toBe(200);
    // Invalid id is silently ignored — returns all transactions
    expect(res.body.data.length).toBe(3);
  });

  it('does not return transactions belonging to other users', async () => {
    const other = await User.create({ googleId: 'g-other2', email: 'o2@t.com', displayName: 'O2' });
    await Transaction.create({ userId: other._id, type: 'expense', amount: 5, amountUSD: 5, description: 'OtherTx', category: foodCat._id, date: new Date() });
    const res = await agent.get('/api/transactions');
    expect(res.body.data.some((t) => t.description === 'OtherTx')).toBe(false);
  });
});

describe('GET /api/transactions/:id', () => {
  it('returns a single transaction', async () => {
    const tx = await Transaction.create(
      { userId: user._id, type: 'expense', amount: 50, amountUSD: 50, description: 'Solo', category: foodCat._id, date: new Date() }
    );
    const res = await agent.get(`/api/transactions/${tx._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Solo');
  });

  it('returns 404 for another user\'s transaction', async () => {
    const other = await User.create({ googleId: 'g-another', email: 'an@t.com', displayName: 'An' });
    const tx = await Transaction.create(
      { userId: other._id, type: 'expense', amount: 5, amountUSD: 5, description: 'NotMine', category: foodCat._id, date: new Date() }
    );
    const res = await agent.get(`/api/transactions/${tx._id}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/transactions/:id', () => {
  it('updates description and amount', async () => {
    const tx = await Transaction.create(
      { userId: user._id, type: 'expense', amount: 10, amountUSD: 10, description: 'Old', category: foodCat._id, date: new Date() }
    );
    const res = await agent.put(`/api/transactions/${tx._id}`).send({ description: 'New', amount: 99 });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('New');
    expect(res.body.data.amount).toBe(99);
  });
});

describe('DELETE /api/transactions/:id (soft delete)', () => {
  it('soft-deletes a transaction', async () => {
    const tx = await Transaction.create(
      { userId: user._id, type: 'expense', amount: 15, amountUSD: 15, description: 'ToDelete', category: foodCat._id, date: new Date() }
    );
    const del = await agent.delete(`/api/transactions/${tx._id}`);
    expect(del.status).toBe(200);

    // No longer appears in listing
    const list = await agent.get('/api/transactions?search=ToDelete');
    expect(list.body.data.length).toBe(0);

    // But the DB document still exists with isDeleted: true
    const dbTx = await Transaction.findById(tx._id);
    expect(dbTx.isDeleted).toBe(true);
    expect(dbTx.deletedAt).toBeTruthy();
  });
});

describe('POST /api/transactions/:id/restore', () => {
  it('restores a soft-deleted transaction', async () => {
    const tx = await Transaction.create(
      { userId: user._id, type: 'expense', amount: 15, amountUSD: 15, description: 'Restore', category: foodCat._id, date: new Date(), isDeleted: true, deletedAt: new Date() }
    );
    const res = await agent.post(`/api/transactions/${tx._id}/restore`);
    expect(res.status).toBe(200);
    const dbTx = await Transaction.findById(tx._id);
    expect(dbTx.isDeleted).toBe(false);
    expect(dbTx.deletedAt).toBeNull();
  });
});

describe('GET /api/transactions/export', () => {
  beforeEach(async () => {
    await Transaction.create(
      { userId: user._id, type: 'expense', amount: 42, amountUSD: 42, description: 'Export test', category: foodCat._id, date: new Date() }
    );
  });

  it('exports CSV by default', async () => {
    const res = await agent.get('/api/transactions/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Export test');
  });

  it('exports XLSX when format=xlsx', async () => {
    const res = await agent.get('/api/transactions/export?format=xlsx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body).toBeTruthy();
  });
});
