const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { passport } = require('../config/passport');
const User = require('../models/User');
const { sendPasswordReset } = require('../services/emailService');

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

// ── Local auth ────────────────────────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { email, password, dateOfBirth, country } = req.body;

  if (!email || !password) {
    return error(res, 'Email and password are required', 400);
  }
  if (password.length < 8) {
    return error(res, 'Password must be at least 8 characters', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return error(res, 'An account with that email already exists', 409);
  }

  const hashed = await bcrypt.hash(password, 12);
  const displayName = email.split('@')[0];

  const user = await User.create({
    email:       email.toLowerCase(),
    displayName,
    password:    hashed,
    dateOfBirth: dateOfBirth || undefined,
    country:     country    || undefined,
  });

  req.logIn(user, (loginErr) => {
    if (loginErr) return error(res, 'Registration failed', 500);
    const safe = user.toObject();
    delete safe.password;
    return success(res, safe, 'Account created', 201);
  });
});

// Uses passport LocalStrategy — must be a plain middleware, not asyncHandler
const localLogin = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return error(res, info?.message || 'Invalid email or password', 401);
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return success(res, req.user, 'Logged in');
    });
  })(req, res, next);
};

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return error(res, 'Email is required', 400);

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond with the same message to prevent email enumeration.
  // Google-only accounts (no local password) are allowed through so they can
  // use the reset flow to add a local password to their account.
  if (!user) {
    return success(res, null, 'If that email is registered, a reset link has been sent');
  }

  const token   = crypto.randomBytes(32).toString('hex');
  const hashed  = crypto.createHash('sha256').update(token).digest('hex');

  user.passwordResetToken   = hashed;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  await sendPasswordReset({ user, resetURL });

  return success(res, null, 'If that email is registered, a reset link has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return error(res, 'Token and new password are required', 400);
  if (password.length < 8)  return error(res, 'Password must be at least 8 characters', 400);

  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken:   hashed,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) return error(res, 'Reset link is invalid or has expired', 400);

  user.password             = await bcrypt.hash(password, 12);
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return success(res, null, 'Password reset successful. You can now log in.');
});

module.exports = { getMe, updateMe, logout, register, localLogin, forgotPassword, resetPassword };
