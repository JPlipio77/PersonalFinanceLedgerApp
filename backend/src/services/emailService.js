const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Alpine Docker containers can fail TLS against smtp.gmail.com due to
    // incomplete CA bundles or corporate SSL inspection proxies.
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });

const budgetAlertTemplate = ({ user, category, budget, spent }) => {
  const percent = Math.round((spent / budget.limitAmount) * 100);
  const remaining = Math.max(0, budget.limitAmount - spent).toFixed(2);
  return {
    subject: `⚠️ Budget alert: ${category.name} (${percent}% used)`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#3b82f6">Finance Ledger — Budget Alert</h2>
        <p>Hi <strong>${user.displayName}</strong>,</p>
        <p>Your <strong>${category.name}</strong> budget has reached <strong>${percent}%</strong> of its limit.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f3f4f6">
            <td style="padding:8px 12px;font-weight:600">Category</td>
            <td style="padding:8px 12px">${category.icon || ''} ${category.name}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:600">Budget limit</td>
            <td style="padding:8px 12px">${budget.currency} ${budget.limitAmount.toFixed(2)}</td>
          </tr>
          <tr style="background:#f3f4f6">
            <td style="padding:8px 12px;font-weight:600">Spent</td>
            <td style="padding:8px 12px;color:#ef4444"><strong>${budget.currency} ${spent.toFixed(2)}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:600">Remaining</td>
            <td style="padding:8px 12px;color:#22c55e">${budget.currency} ${remaining}</td>
          </tr>
        </table>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:4px">
          You have <strong>${budget.currency} ${remaining}</strong> left in your ${category.name} budget for this month.
        </div>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">
          You can manage your budgets and alerts in Finance Ledger settings.
        </p>
      </div>
    `,
  };
};

const sendBudgetAlert = async ({ user, category, budget, spent }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Email alert skipped: SMTP not configured');
    return;
  }
  try {
    const transporter = createTransporter();
    const { subject, html } = budgetAlertTemplate({ user, category, budget, spent });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Finance Ledger" <${process.env.SMTP_USER}>`,
      to:   user.email,
      subject,
      html,
    });
    logger.info(`Budget alert email sent to ${user.email}`);
  } catch (err) {
    logger.error('Failed to send budget alert email', { message: err.message });
  }
};

const sendPasswordReset = async (user, resetUrl) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Password reset email skipped: SMTP not configured');
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Finance Ledger" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Reset your Finance Ledger password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#3b82f6">Finance Ledger — Password Reset</h2>
          <p>Hi <strong>${user.displayName}</strong>,</p>
          <p>We received a request to reset your password. Click the button below. This link expires in 1 hour.</p>
          <div style="margin:24px 0;text-align:center">
            <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Reset Password</a>
          </div>
          <p>If you didn't request this, ignore this email.</p>
          <p style="color:#6b7280;font-size:12px">Link: <a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      `,
    });
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (err) {
    logger.error('Failed to send password reset email', { message: err.message });
  }
};

module.exports = { sendBudgetAlert, budgetAlertTemplate, sendPasswordReset };
