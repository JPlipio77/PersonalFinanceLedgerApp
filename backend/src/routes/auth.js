const router = require('express').Router();
const { passport } = require('../config/passport');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  getMe, updateMe, logout,
  register, localLogin, forgotPassword, resetPassword,
} = require('../controllers/authController');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// ── Local auth ────────────────────────────────────────────────────────────────
router.post('/register',       authLimiter, register);
router.post('/login',          authLimiter, localLogin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password',  authLimiter, resetPassword);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL()}/login?error=oauth_failed` }),
  (_req, res) => res.redirect(FRONTEND_URL())
);

// Switch account — destroys the current session then sends the user to Google's
// account picker. After selecting an account the normal OAuth callback flow runs.
router.get('/switch', requireAuth, (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect('/api/auth/google');
    });
  });
});

// ── Profile ───────────────────────────────────────────────────────────────────
router.post('/logout', logout);
router.get('/me',  requireAuth, getMe);
router.put('/me',  requireAuth, updateMe);

module.exports = router;
