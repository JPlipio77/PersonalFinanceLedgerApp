const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  listNotifications, markRead, markAllRead,
  deleteNotification, subscribePush, unsubscribePush,
} = require('../controllers/notificationController');

router.use(requireAuth);

router.get('/',                   listNotifications);
router.put('/read-all',           markAllRead);          // must be before /:id
router.put('/:id/read',           markRead);
router.delete('/unsubscribe',     unsubscribePush);      // must be before /:id
router.delete('/:id',             deleteNotification);
router.post('/subscribe',         subscribePush);

module.exports = router;
