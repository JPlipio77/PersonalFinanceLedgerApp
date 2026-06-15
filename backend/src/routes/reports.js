const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getMonthlyReport, getYearlyReport } = require('../controllers/reportController');

router.use(requireAuth);

router.get('/monthly', getMonthlyReport);
router.get('/yearly',  getYearlyReport);

module.exports = router;
