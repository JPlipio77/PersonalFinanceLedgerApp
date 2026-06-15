const webpush = require('web-push');
const { sendBudgetAlert, initWebPush } = require('../../../src/services/pushService');

jest.mock('web-push');

const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/push/test',
  keys: { p256dh: 'abc', auth: 'xyz' },
};

const payload = {
  subscription: mockSubscription,
  category:     { name: 'Food', icon: '🍔' },
  budget:       { limitAmount: 100, currency: 'USD' },
  spent:        85,
};

beforeEach(() => jest.clearAllMocks());

describe('pushService', () => {
  it('calls webpush.sendNotification with correct payload', async () => {
    webpush.sendNotification.mockResolvedValue({});
    await sendBudgetAlert(payload);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    const [sub, rawPayload] = webpush.sendNotification.mock.calls[0];
    expect(sub).toBe(mockSubscription);

    const parsed = JSON.parse(rawPayload);
    expect(parsed.title).toContain('Food');
    expect(parsed.body).toContain('15.00'); // remaining
  });

  it('skips sending when subscription is missing', async () => {
    await sendBudgetAlert({ ...payload, subscription: null });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('skips when subscription has no endpoint', async () => {
    await sendBudgetAlert({ ...payload, subscription: {} });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('throws with expired=true on 410 status', async () => {
    const err = Object.assign(new Error('Gone'), { statusCode: 410 });
    webpush.sendNotification.mockRejectedValue(err);
    await expect(sendBudgetAlert(payload)).rejects.toMatchObject({ expired: true });
  });

  it('initWebPush calls setVapidDetails when keys are set', () => {
    process.env.VAPID_PUBLIC_KEY  = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    process.env.VAPID_MAILTO      = 'mailto:test@example.com';
    initWebPush();
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com', 'pub', 'priv'
    );
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });
});
