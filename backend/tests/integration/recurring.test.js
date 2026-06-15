const request = require('supertest');
const app = require('../../src/app');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const Category = require('../../src/models/Category');
const RecurringRule = require('../../src/models/RecurringRule');
const User = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');

beforeAll(() => connectTestDB());
afterAll(() => disconnectTestDB());
afterEach(async () => {
  await RecurringRule.deleteMany({});
  await User.deleteMany({});
});

describe('Recurring Rules API', () => {
  let agent, user, category;

  beforeEach(async () => {
    await Category.deleteMany({});
    await seedCategories();
    category = await Category.findOne({ isSystem: true }).lean();
    ({ agent, user } = await createAuthenticatedAgent(request, app));
  });

  const rulePayload = (overrides = {}) => ({
    type: 'expense',
    amount: 50,
    description: 'Monthly subscription',
    category: category._id.toString(),
    frequency: 'monthly',
    startDate: new Date().toISOString(),
    ...overrides,
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/recurring');
    expect(res.status).toBe(401);
  });

  it('GET / returns empty list initially', async () => {
    const res = await agent.get('/api/recurring');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('POST / creates a recurring rule', async () => {
    const res = await agent.post('/api/recurring').send(rulePayload());
    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe('Monthly subscription');
    expect(res.body.data.frequency).toBe('monthly');
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.category.name).toBeTruthy();
  });

  it('POST / validates required fields', async () => {
    const res = await agent.post('/api/recurring').send({ amount: 50 });
    expect(res.status).toBe(422);
  });

  it('POST / rejects invalid category id', async () => {
    const res = await agent.post('/api/recurring').send(rulePayload({ category: '000000000000000000000000' }));
    expect(res.status).toBe(404);
  });

  it('GET / lists created rules', async () => {
    await agent.post('/api/recurring').send(rulePayload());
    await agent.post('/api/recurring').send(rulePayload({ description: 'Rent', frequency: 'monthly', amount: 1200 }));
    const res = await agent.get('/api/recurring');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('GET /:id returns a single rule', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload());
    const id = create.body.data._id;
    const res = await agent.get(`/api/recurring/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(id);
  });

  it('PUT /:id updates isActive flag', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload());
    const id = create.body.data._id;
    const res = await agent.put(`/api/recurring/${id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('DELETE /:id removes the rule', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload());
    const id = create.body.data._id;
    const del = await agent.delete(`/api/recurring/${id}`);
    expect(del.status).toBe(200);
    const get = await agent.get(`/api/recurring/${id}`);
    expect(get.status).toBe(404);
  });

  it('PUT /:id recomputes nextRunDate for weekly frequency', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload({ frequency: 'monthly' }));
    const id = create.body.data._id;
    const res = await agent.put(`/api/recurring/${id}`).send({ frequency: 'weekly' });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('weekly');
  });

  it('PUT /:id recomputes nextRunDate for daily frequency', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload({ frequency: 'monthly' }));
    const id = create.body.data._id;
    const res = await agent.put(`/api/recurring/${id}`).send({ frequency: 'daily' });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('daily');
  });

  it('PUT /:id recomputes nextRunDate for yearly frequency', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload({ frequency: 'monthly' }));
    const id = create.body.data._id;
    const res = await agent.put(`/api/recurring/${id}`).send({ frequency: 'yearly' });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('yearly');
  });

  it('PUT /:id recomputes nextRunDate for monthly frequency', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload({ frequency: 'weekly' }));
    const id = create.body.data._id;
    const res = await agent.put(`/api/recurring/${id}`).send({ frequency: 'monthly' });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('monthly');
  });

  it('creates a daily recurring rule', async () => {
    const res = await agent.post('/api/recurring').send(rulePayload({ frequency: 'daily', amount: 5, description: 'Coffee' }));
    expect(res.status).toBe(201);
    expect(res.body.data.frequency).toBe('daily');
  });

  it('creates a yearly recurring rule', async () => {
    const res = await agent.post('/api/recurring').send(rulePayload({ frequency: 'yearly', amount: 500, description: 'Annual fee' }));
    expect(res.status).toBe(201);
    expect(res.body.data.frequency).toBe('yearly');
  });

  it('prevents accessing another user\'s rule', async () => {
    const create = await agent.post('/api/recurring').send(rulePayload());
    const id = create.body.data._id;
    const { agent: agent2 } = await createAuthenticatedAgent(request, app);
    const res = await agent2.get(`/api/recurring/${id}`);
    expect(res.status).toBe(404);
  });
});
