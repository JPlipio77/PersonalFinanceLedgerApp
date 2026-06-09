const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { success, created, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { sendPasswordReset } = require('../services/emailService');
const logger = require('../utils/logger');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000';

const sanitize = (user) => {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.password;
  delete u.resetPasswordToken;
  delete u.resetPasswordExpires;
  return u;
};

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const register = asyncHandler(async (req, res) => {
  const { email, username, password, confirmPassword, birthday, country } = req.body;

  if (!email || !username || !password || !confirmPassword) {
    return error(res, 'Email, username, password, and confirm password are required', 400);
  }
  if (!USERNAME_RE.test(username.toLowerCase())) {
    return error(res, 'Username must be 3–20 characters and contain only letters, numbers, or underscores', 400);
  }
  if (password !== confirmPassword) {
    return error(res, 'Passwords do not match', 400);
  }
  if (password.length < 8) {
    return error(res, 'Password must be at least 8 characters', 400);
  }

  const [emailTaken, usernameTaken] = await Promise.all([
    User.findOne({ email: email.toLowerCase() }),
    User.findOne({ username: username.toLowerCase() }),
  ]);
  if (emailTaken) return error(res, 'Email already registered', 409);
  if (usernameTaken) return error(res, 'Username already taken', 409);

  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({
    email,
    username: username.toLowerCase(),
    displayName: username,
    password: hashed,
    birthday: birthday || undefined,
    country: country || undefined,
    authProvider: 'local',
  });

  await new Promise((resolve, reject) =>
    req.login(user, (err) => (err ? reject(err) : resolve()))
  );

  return created(res, sanitize(user), 'Account created');
});

const login = (req, res, next) => {
  const { passport: p } = require('../config/passport');
  p.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return error(res, info?.message || 'Invalid credentials', 401);
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return success(res, sanitize(user), 'Logged in');
    });
  })(req, res, next);
};

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return error(res, 'Email is required', 400);

  const user = await User.findOne({ email: email.toLowerCase(), authProvider: 'local' });

  if (!user) {
    // Don't reveal whether email exists
    return success(res, null, 'If that email exists, a reset link has been sent');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  user.resetPasswordToken = hashed;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const resetUrl = `${FRONTEND_URL()}/reset-password/${token}`;
  logger.info(`Password reset link: ${resetUrl}`);

  await sendPasswordReset(user, resetUrl);

  const response = { message: 'If that email exists, a reset link has been sent' };
  // Expose token in non-production so automated tests can verify the full flow
  if (process.env.NODE_ENV !== 'production') response._devToken = token;

  return success(res, response);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return error(res, 'New password and confirm password are required', 400);
  }
  if (password !== confirmPassword) return error(res, 'Passwords do not match', 400);
  if (password.length < 8) return error(res, 'Password must be at least 8 characters', 400);

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) return error(res, 'Reset link is invalid or has expired', 400);

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await new Promise((resolve, reject) =>
    req.login(user, (err) => (err ? reject(err) : resolve()))
  );

  return success(res, null, 'Password updated successfully');
});

const getMe = asyncHandler(async (req, res) => {
  return success(res, req.user);
});

const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['displayName', 'currency', 'timezone', 'emailAlerts', 'pushAlerts'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  req.user = user;
  return success(res, user, 'Profile updated');
});

const logout = asyncHandler(async (req, res) => {
  req.logout((err) => {
    if (err) return error(res, 'Logout failed', 500);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return success(res, null, 'Logged out');
    });
  });
});

module.exports = { register, login, forgotPassword, resetPassword, getMe, updateMe, logout };
