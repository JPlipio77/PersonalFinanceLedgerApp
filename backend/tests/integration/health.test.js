const request = require('supertest');
const app = require('../../src/app');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});
