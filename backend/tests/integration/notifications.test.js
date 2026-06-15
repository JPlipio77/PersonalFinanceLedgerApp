const request      = require('supertest');
const app          = require('../../src/app');
const Notification = require('../../src/models/Notification');
const User         = require('../../src/models/User');
const { createAuthenticatedAgent } = require('../helpers/authHelper');
const { connectTestDB, disconnectTestDB } = require('../helpers/dbHelper');

let agent, user;

beforeAll(async () => { await connectTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Notification.deleteMany({})]);
  ({ agent, user } = await createAuthenticatedAgent(request, app));
});

const makeNotif = (overrides = {}) =>
  Notification.create({
    userId:  user._id,
    type:    'budget_alert',
    channel: 'in_app',
    title:   'Budget alert',
    message: 'You exceeded 80% of your Food budget',
    isRead:  false,
    ...overrides,
  });

describe('GET /api/notifications', () => {
  it('returns paginated notifications', async () => {
    await makeNotif();
    await makeNotif({ title: 'Second' });
    const res = await agent.get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.unreadCount).toBe(2);
  });

  it('filters unread when unreadOnly=true', async () => {
    await makeNotif({ isRead: true });
    await makeNotif({ isRead: false });
    const res = await agent.get('/api/notifications?unreadOnly=true');
    expect(res.body.data.length).toBe(1);
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const notif = await makeNotif();
    const res = await agent.put(`/api/notifications/${notif._id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  it('returns 404 for another user\'s notification', async () => {
    const other = await User.create({ googleId: 'g-x', email: 'x@t.com', displayName: 'X' });
    const notif = await Notification.create({
      userId: other._id, type: 'budget_alert', channel: 'in_app',
      title: 'Other', message: 'Other', isRead: false,
    });
    const res = await agent.put(`/api/notifications/${notif._id}/read`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/notifications/read-all', () => {
  it('marks all notifications as read', async () => {
    await makeNotif();
    await makeNotif();
    const res = await agent.put('/api/notifications/read-all');
    expect(res.status).toBe(200);
    const unread = await Notification.countDocuments({ userId: user._id, isRead: false });
    expect(unread).toBe(0);
  });
});

describe('DELETE /api/notifications/:id', () => {
  it('deletes a notification', async () => {
    const notif = await makeNotif();
    const res = await agent.delete(`/api/notifications/${notif._id}`);
    expect(res.status).toBe(200);
    expect(await Notification.findById(notif._id)).toBeNull();
  });
});

describe('POST /api/notifications/subscribe', () => {
  it('saves push subscription to user', async () => {
    const sub = {
      endpoint: 'https://fcm.googleapis.com/push/abc',
      keys: { p256dh: 'key1', auth: 'auth1' },
    };
    const res = await agent.post('/api/notifications/subscribe').send(sub);
    expect(res.status).toBe(200);
    const dbUser = await User.findById(user._id);
    expect(dbUser.pushSubscription.endpoint).toBe(sub.endpoint);
    expect(dbUser.pushAlerts).toBe(true);
  });

  it('rejects malformed subscription object', async () => {
    const res = await agent.post('/api/notifications/subscribe').send({ endpoint: 'only-endpoint' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/notifications/unsubscribe', () => {
  it('removes push subscription from user', async () => {
    await User.findByIdAndUpdate(user._id, {
      pushSubscription: { endpoint: 'https://example.com', keys: { p256dh: 'k', auth: 'a' } },
    });
    const res = await agent.delete('/api/notifications/unsubscribe');
    expect(res.status).toBe(200);
    const dbUser = await User.findById(user._id);
    expect(dbUser.pushSubscription?.endpoint).toBeUndefined();
    expect(dbUser.pushAlerts).toBe(false);
  });
});
