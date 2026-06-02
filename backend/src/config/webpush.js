// Configured in Phase 4 — VAPID keys wired here
const webpush = require('web-push');

const initWebPush = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_MAILTO || 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
};

module.exports = { webpush, initWebPush };
