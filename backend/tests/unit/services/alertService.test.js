const mongoose = require('mongoose');

// ─── Mock dependencies before requiring alertService ───────────────────────
jest.mock('../../../src/models/Budget');
jest.mock('../../../src/models/Transaction');
jest.mock('../../../src/models/Notification');
jest.mock('../../../src/models/User');
jest.mock('../../../src/services/emailService');
jest.mock('../../../src/services/pushService');

const Budget       = require('../../../src/models/Budget');
const Transaction  = require('../../../src/models/Transaction');
const Notification = require('../../../src/models/Notification');
const User         = require('../../../src/models/User');
const emailService = require('../../../src/services/emailService');
const pushService  = require('../../../src/services/pushService');
const { checkBudgetThreshold } = require('../../../src/services/alertService');

const userId   = new mongoose.Types.ObjectId();
const catId    = new mongoose.Types.ObjectId();
const budgetId = new mongoose.Types.ObjectId();

const mockUser = {
  _id:           userId,
  email:         'user@test.com',
  displayName:   'Tester',
  emailAlerts:   true,
  pushAlerts:    true,
  pushSubscription: { endpoint: 'https://push.example.com', keys: { p256dh: 'x', auth: 'y' } },
};

const mockCategory = { _id: catId, name: 'Food', icon: '🍔' };

const mockBudget = {
  _id:            budgetId,
  userId,
  category:       catId,
  limitAmount:    100,
  currency:       'USD',
  alertThreshold: 0.8,
  alertSent:      false,
};

const mockTransaction = {
  _id:  new mongoose.Types.ObjectId(),
  type: 'expense',
  date: new Date('2026-05-15'),
};

beforeEach(() => {
  jest.clearAllMocks();
  Budget.findOne = jest.fn().mockResolvedValue(mockBudget);
  Budget.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  Transaction.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 85 }]);
  Notification.create = jest.fn().mockResolvedValue({});
  User.findById = jest.fn().mockReturnValue({ lean: () => Promise.resolve(mockUser) });
  emailService.sendBudgetAlert = jest.fn().mockResolvedValue();
  pushService.sendBudgetAlert = jest.fn().mockResolvedValue();
  pushService.initWebPush = jest.fn();
});

describe('alertService.checkBudgetThreshold', () => {
  it('sends email and push when spending exceeds threshold', async () => {
    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);

    expect(Budget.findByIdAndUpdate).toHaveBeenCalledWith(budgetId, { alertSent: true });
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'budget_alert', userId })
    );
    expect(emailService.sendBudgetAlert).toHaveBeenCalledTimes(1);
    expect(pushService.sendBudgetAlert).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no budget is set for the category', async () => {
    Budget.findOne.mockResolvedValue(null);
    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);
    expect(emailService.sendBudgetAlert).not.toHaveBeenCalled();
  });

  it('does nothing when alertSent is already true (deduplication)', async () => {
    Budget.findOne.mockResolvedValue({ ...mockBudget, alertSent: true });
    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);
    expect(emailService.sendBudgetAlert).not.toHaveBeenCalled();
  });

  it('does nothing when spending is below threshold (< 80%)', async () => {
    Transaction.aggregate.mockResolvedValue([{ _id: null, total: 70 }]); // 70%
    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);
    expect(emailService.sendBudgetAlert).not.toHaveBeenCalled();
  });

  it('skips email when user has emailAlerts disabled', async () => {
    User.findById.mockReturnValue({ lean: () => Promise.resolve({ ...mockUser, emailAlerts: false }) });
    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);
    expect(emailService.sendBudgetAlert).not.toHaveBeenCalled();
    expect(pushService.sendBudgetAlert).toHaveBeenCalledTimes(1);
  });

  it('skips push when user has no pushSubscription', async () => {
    User.findById.mockReturnValue({ lean: () => Promise.resolve({ ...mockUser, pushSubscription: null }) });
    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);
    expect(pushService.sendBudgetAlert).not.toHaveBeenCalled();
    expect(emailService.sendBudgetAlert).toHaveBeenCalledTimes(1);
  });

  it('skips for income transactions', async () => {
    await checkBudgetThreshold(mockUser, mockCategory, { ...mockTransaction, type: 'income' });
    expect(Budget.findOne).not.toHaveBeenCalled();
  });

  it('clears expired push subscription on 410 error', async () => {
    const expiredErr = Object.assign(new Error('Gone'), { statusCode: 410, expired: true });
    pushService.sendBudgetAlert.mockRejectedValue(expiredErr);
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    await checkBudgetThreshold(mockUser, mockCategory, mockTransaction);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId, { $unset: { pushSubscription: '' } }
    );
  });

  it('does not throw if an internal error occurs (fire-and-forget)', async () => {
    Budget.findOne.mockRejectedValue(new Error('DB error'));
    await expect(checkBudgetThreshold(mockUser, mockCategory, mockTransaction)).resolves.toBeUndefined();
  });
});
