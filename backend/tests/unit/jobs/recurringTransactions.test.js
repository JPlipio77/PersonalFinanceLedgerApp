jest.mock('node-cron');
jest.mock('../../../src/models/RecurringRule');
jest.mock('../../../src/models/Transaction');
jest.mock('../../../src/models/Budget');
jest.mock('../../../src/services/currencyService');

const cron           = require('node-cron');
const RecurringRule  = require('../../../src/models/RecurringRule');
const Transaction    = require('../../../src/models/Transaction');
const Budget         = require('../../../src/models/Budget');
const currencyService = require('../../../src/services/currencyService');
const {
  processRecurringTransactions,
  resetMonthlyAlerts,
  startCronJobs,
} = require('../../../src/jobs/recurringTransactions');

const mockRule = {
  _id: 'rule1',
  userId: 'user1',
  type: 'expense',
  amount: 50,
  currency: 'USD',
  description: 'Subscription',
  category: 'cat1',
  frequency: 'monthly',
  nextRunDate: new Date('2026-05-01'),
};

const mockFind = (rules) =>
  RecurringRule.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(rules) });

describe('processRecurringTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currencyService.convertToUSD.mockResolvedValue(50);
    Transaction.create.mockResolvedValue({ _id: 'tx1' });
    RecurringRule.findByIdAndUpdate.mockResolvedValue({});
  });

  it('does nothing when no rules are due', async () => {
    mockFind([]);
    await processRecurringTransactions();
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  it('creates a transaction for each due rule', async () => {
    mockFind([mockRule]);
    await processRecurringTransactions();
    expect(Transaction.create).toHaveBeenCalledTimes(1);
    expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      userId:      mockRule.userId,
      type:        mockRule.type,
      amount:      mockRule.amount,
      isRecurring: true,
      recurringId: mockRule._id,
    }));
  });

  it('advances nextRunDate for monthly frequency', async () => {
    mockFind([mockRule]);
    await processRecurringTransactions();
    const [id, update] = RecurringRule.findByIdAndUpdate.mock.calls[0];
    expect(id).toBe('rule1');
    // nextRunDate should advance by one month: May → June
    expect(update.nextRunDate.getMonth()).toBe(new Date('2026-06-01').getMonth());
  });

  it('handles partial failures gracefully', async () => {
    mockFind([mockRule, { ...mockRule, _id: 'rule2' }]);
    Transaction.create
      .mockResolvedValueOnce({ _id: 'tx1' })
      .mockRejectedValueOnce(new Error('DB error'));
    await expect(processRecurringTransactions()).resolves.not.toThrow();
  });
});

describe('processRecurringTransactions — frequency nextRunDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currencyService.convertToUSD.mockResolvedValue(50);
    Transaction.create.mockResolvedValue({ _id: 'tx1' });
    RecurringRule.findByIdAndUpdate.mockResolvedValue({});
  });

  it.each([
    ['daily',   new Date('2026-05-01'), 5, 2],   // May→May+1d
    ['weekly',  new Date('2026-05-01'), 5, 8],   // May 1→May 8
    ['yearly',  new Date('2026-05-01'), 5, 1],   // May 2026 → May 2027 (month still 5, year+1)
  ])('advances nextRunDate correctly for %s', async (frequency, nextRunDate, expectedMonth, _) => {
    const rule = { ...mockRule, frequency, nextRunDate };
    mockFind([rule]);
    await processRecurringTransactions();
    const newDate = RecurringRule.findByIdAndUpdate.mock.calls[0][1].nextRunDate;
    if (frequency === 'yearly') {
      expect(newDate.getFullYear()).toBe(2027);
    } else if (frequency === 'daily') {
      expect(newDate.getDate()).toBe(2);
    } else if (frequency === 'weekly') {
      expect(newDate.getDate()).toBe(8);
    }
  });
});

describe('resetMonthlyAlerts', () => {
  it('resets alertSent on all budgets', async () => {
    Budget.updateMany.mockResolvedValue({ modifiedCount: 5 });
    await resetMonthlyAlerts();
    expect(Budget.updateMany).toHaveBeenCalledWith({}, { alertSent: false });
  });
});

describe('startCronJobs', () => {
  let cronCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    cronCallbacks = [];
    cron.schedule.mockImplementation((_, callback) => {
      cronCallbacks.push(callback);
    });
    currencyService.convertToUSD.mockResolvedValue(50);
    Transaction.create.mockResolvedValue({ _id: 'tx1' });
    RecurringRule.findByIdAndUpdate.mockResolvedValue({});
    Budget.updateMany.mockResolvedValue({ modifiedCount: 0 });
  });

  it('registers two cron jobs', () => {
    startCronJobs();
    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });

  it('daily job processes recurring transactions', async () => {
    mockFind([mockRule]);
    startCronJobs();
    await cronCallbacks[0](); // fire daily job
    expect(Transaction.create).toHaveBeenCalledTimes(1);
  });

  it('daily job handles errors without throwing', async () => {
    mockFind([]);
    RecurringRule.find.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('DB down')) });
    startCronJobs();
    await expect(cronCallbacks[0]()).resolves.not.toThrow();
  });

  it('monthly job resets budget alerts', async () => {
    startCronJobs();
    await cronCallbacks[1](); // fire monthly job
    expect(Budget.updateMany).toHaveBeenCalledWith({}, { alertSent: false });
  });

  it('monthly job handles errors without throwing', async () => {
    Budget.updateMany.mockRejectedValue(new Error('DB down'));
    startCronJobs();
    await expect(cronCallbacks[1]()).resolves.not.toThrow();
  });
});
