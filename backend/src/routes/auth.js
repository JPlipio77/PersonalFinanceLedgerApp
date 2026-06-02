const router = require('express').Router();
const { passport } = require('../config/passport');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { getMe, updateMe, logout } = require('../controllers/authController');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Kick off Google OAuth — always show account picker so user can choose which email
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

// Google OAuth callback
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

router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);

module.exports = router;
