const nodemailer = require('nodemailer');
const { sendBudgetAlert, budgetAlertTemplate, sendPasswordReset } = require('../../../src/services/emailService');

jest.mock('nodemailer');

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

const payload = {
  user:     { displayName: 'JP', email: 'jp@test.com', emailAlerts: true },
  category: { name: 'Food', icon: '🍔' },
  budget:   { limitAmount: 100, currency: 'USD', alertThreshold: 0.8 },
  spent:    85,
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SMTP_USER = 'test@smtp.com';
  process.env.SMTP_PASS = 'secret';
});

afterEach(() => {
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
});

describe('emailService', () => {
  it('calls sendMail with correct subject and recipient', async () => {
    await sendBudgetAlert(payload);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('jp@test.com');
    expect(call.subject).toContain('Food');
    expect(call.subject).toContain('85%');
  });

  it('includes spent and remaining in HTML body', async () => {
    const { html } = budgetAlertTemplate(payload);
    expect(html).toContain('85.00');
    expect(html).toContain('15.00');
    expect(html).toContain('Food');
  });

  it('skips sending when SMTP credentials are not configured', async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    await sendBudgetAlert(payload);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('does not throw when sendMail rejects', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(sendBudgetAlert(payload)).resolves.toBeUndefined();
  });

  describe('sendPasswordReset', () => {
    const resetPayload = {
      user:     { displayName: 'JP', email: 'jp@test.com' },
      resetURL: 'http://localhost:3000/reset-password?token=abc123',
    };

    it('sends reset email with correct subject and recipient', async () => {
      await sendPasswordReset(resetPayload);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('jp@test.com');
      expect(call.subject).toContain('Password Reset');
    });

    it('includes reset URL in email body', async () => {
      await sendPasswordReset(resetPayload);
      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('http://localhost:3000/reset-password?token=abc123');
    });

    it('skips sending when SMTP credentials are not configured', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      await sendPasswordReset(resetPayload);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('does not throw when sendMail rejects', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));
      await expect(sendPasswordReset(resetPayload)).resolves.toBeUndefined();
    });
  });
});
