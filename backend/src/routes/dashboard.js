const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getOverview,
  getRecentTransactions,
  getSpendingByCategory,
  getTrend,
} = require('../controllers/dashboardController');

router.use(requireAuth);

router.get('/overview',             getOverview);
router.get('/recent-transactions',  getRecentTransactions);
router.get('/spending-by-category', getSpendingByCategory);
router.get('/trend',                getTrend);

module.exports = router;
