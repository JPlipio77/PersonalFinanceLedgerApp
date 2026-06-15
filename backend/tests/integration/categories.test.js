const request = require('supertest');
const app = require('../../src/app');
const Category = require('../../src/models/Category');
const Transaction = require('../../src/models/Transaction');
const User = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

let agent, user, foodCat;

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Transaction.deleteMany({})]);
  await seedCategories();
  foodCat = await Category.findOne({ name: 'Food', isSystem: true });
  ({ agent, user } = await createAuthenticatedAgent(request, app));
});

describe('GET /api/categories', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('returns system categories for authenticated user', async () => {
    const res = await agent.get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(14);
    const names = res.body.data.map((c) => c.name);
    expect(names).toContain('Food');
    expect(names).toContain('Utilities');
  });

  it('includes user custom categories alongside system ones', async () => {
    await Category.create({ name: 'MyCustom', userId: user._id, isSystem: false });
    const res = await agent.get('/api/categories');
    const names = res.body.data.map((c) => c.name);
    expect(names).toContain('MyCustom');
  });
});

describe('POST /api/categories', () => {
  it('creates a custom category', async () => {
    const res = await agent.post('/api/categories').send({ name: 'Hobbies', icon: '🎸', color: '#3b82f6' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Hobbies');
    expect(res.body.data.isSystem).toBe(false);
  });

  it('rejects duplicate custom category name for same user', async () => {
    await agent.post('/api/categories').send({ name: 'Gym' });
    const res = await agent.post('/api/categories').send({ name: 'Gym' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid hex color', async () => {
    const res = await agent.post('/api/categories').send({ name: 'Bad', color: 'notahex' });
    expect(res.status).toBe(422);
  });

  it('rejects empty name', async () => {
    const res = await agent.post('/api/categories').send({ name: '' });
    expect(res.status).toBe(422);
  });
});

describe('PUT /api/categories/:id', () => {
  it('updates a custom category', async () => {
    const cat = await Category.create({ name: 'Old', userId: user._id, isSystem: false });
    const res = await agent.put(`/api/categories/${cat._id}`).send({ name: 'New', color: '#ef4444' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New');
  });

  it('returns 403 when trying to modify a system category', async () => {
    const res = await agent.put(`/api/categories/${foodCat._id}`).send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when category belongs to another user', async () => {
    const otherUser = await User.create({ googleId: 'g-other', email: 'other@t.com', displayName: 'Other' });
    const otherCat = await Category.create({ name: 'OtherCat', userId: otherUser._id, isSystem: false });
    const res = await agent.put(`/api/categories/${otherCat._id}`).send({ name: 'Steal' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('deletes a custom category with no transactions', async () => {
    const cat = await Category.create({ name: 'Empty', userId: user._id, isSystem: false });
    const res = await agent.delete(`/api/categories/${cat._id}`);
    expect(res.status).toBe(200);
    expect(await Category.findById(cat._id)).toBeNull();
  });

  it('blocks deletion when transactions reference the category', async () => {
    const cat = await Category.create({ name: 'Used', userId: user._id, isSystem: false });
    await Transaction.create({
      userId: user._id, type: 'expense', amount: 10,
      description: 'test', category: cat._id, date: new Date(),
    });
    const res = await agent.delete(`/api/categories/${cat._id}`);
    expect(res.status).toBe(409);
  });

  it('returns 403 for system categories', async () => {
    const res = await agent.delete(`/api/categories/${foodCat._id}`);
    expect(res.status).toBe(403);
  });
});
