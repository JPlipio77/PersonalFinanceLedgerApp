/**
 * Quick smoke-test for SMTP configuration.
 * Calls nodemailer directly so errors are not swallowed.
 *
 * Usage (from backend/):
 *   node scripts/testEmailAlert.js <recipient-email>
 *
 * Or inside the running backend container:
 *   docker exec finance_backend node scripts/testEmailAlert.js <recipient-email>
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const recipient = process.argv[2];

if (!recipient) {
  console.error('Usage: node scripts/testEmailAlert.js <recipient-email>');
  console.error('Example: node scripts/testEmailAlert.js you@gmail.com');
  process.exit(1);
}

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');

console.log('SMTP config:');
console.log(`  SMTP_USER : ${smtpUser  || '(not set) ← add to backend/.env'}`);
console.log(`  SMTP_HOST : ${smtpHost}`);
console.log(`  SMTP_PORT : ${smtpPort}`);
console.log(`  SMTP_PASS : ${smtpPass ? '****** (set)' : '(not set) ← add to backend/.env'}`);
console.log('');

if (!smtpUser || !smtpPass) {
  console.error('✗  Aborted: SMTP_USER and SMTP_PASS must be set in backend/.env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host:   smtpHost,
  port:   smtpPort,
  secure: smtpPort === 465,
  auth:   { user: smtpUser, pass: smtpPass },
  tls:    { rejectUnauthorized: false },
});

const html = `
  <div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#3b82f6">Finance Ledger — Budget Alert (TEST)</h2>
    <p>Hi <strong>Test User</strong>,</p>
    <p>Your <strong>Food &amp; Dining</strong> budget has reached <strong>84%</strong> of its limit.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f3f4f6">
        <td style="padding:8px 12px;font-weight:600">Budget limit</td>
        <td style="padding:8px 12px">PHP 5,000.00</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:600">Spent</td>
        <td style="padding:8px 12px;color:#ef4444"><strong>PHP 4,200.00</strong></td>
      </tr>
      <tr style="background:#f3f4f6">
        <td style="padding:8px 12px;font-weight:600">Remaining</td>
        <td style="padding:8px 12px;color:#22c55e">PHP 800.00</td>
      </tr>
    </table>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:4px">
      This is a <strong>test email</strong> sent from the Finance Ledger SMTP smoke-test script.
    </div>
  </div>
`;

(async () => {
  console.log(`Sending test budget alert to ${recipient} …`);
  try {
    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM || `"Finance Ledger" <${smtpUser}>`,
      to:      recipient,
      subject: '⚠️ Budget alert: Food & Dining (84% used) [TEST]',
      html,
    });
    console.log('✓  Email sent successfully!');
    console.log(`   Message ID : ${info.messageId}`);
    console.log('   Check your inbox (and spam folder).');
  } catch (err) {
    console.error('✗  Send failed:', err.message);
    if (err.message.includes('Invalid login') || err.message.includes('Username and Password')) {
      console.error('   → Wrong Gmail App Password. Re-generate at myaccount.google.com/apppasswords');
    } else if (err.message.includes('certificate')) {
      console.error('   → TLS certificate error. Check SMTP_HOST or network proxy settings.');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      console.error('   → Cannot reach SMTP host. Check SMTP_HOST/SMTP_PORT and network connectivity.');
    }
    process.exit(1);
  }
})();
