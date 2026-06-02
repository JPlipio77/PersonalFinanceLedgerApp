const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { success, error, paginated } = require('../utils/apiResponse');

const listNotifications = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = { userId: req.user._id };
  if (req.query.unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedCategory', 'name icon color')
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  return paginated(res, notifications, {
    page, limit, total,
    pages: Math.ceil(total / limit),
    unreadCount,
  });
});

const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) return error(res, 'Notification not found', 404);
  return success(res, notif);
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  return success(res, null, 'All notifications marked as read');
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!notif) return error(res, 'Notification not found', 404);
  return success(res, null, 'Notification deleted');
});

const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return error(res, 'Invalid push subscription object', 400);
  }
  await User.findByIdAndUpdate(req.user._id, {
    pushSubscription: { endpoint, keys },
    pushAlerts: true,
  });
  return success(res, null, 'Push subscription saved');
});

const unsubscribePush = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { pushSubscription: '' },
    pushAlerts: false,
  });
  return success(res, null, 'Push subscription removed');
});

module.exports = {
  listNotifications, markRead, markAllRead,
  deleteNotification, subscribePush, unsubscribePush,
};
