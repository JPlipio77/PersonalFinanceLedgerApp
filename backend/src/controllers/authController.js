const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

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

  // Keep session in sync
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

module.exports = { getMe, updateMe, logout };
