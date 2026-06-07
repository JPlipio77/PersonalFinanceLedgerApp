const router = require('express').Router();
const { passport } = require('../config/passport');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  register, login, forgotPassword, resetPassword,
  getMe, updateMe, logout,
} = require('../controllers/authController');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Local auth
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Google OAuth
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL()}/login?error=oauth_failed` }),
  (_req, res) => res.redirect(FRONTEND_URL())
);

router.get('/switch', requireAuth, (req, res) => {
  req.logout(() => {
    req.session.destroy(() => res.redirect('/api/auth/google'));
  });
});

router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);

module.exports = router;
