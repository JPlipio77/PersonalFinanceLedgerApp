const router = require('express').Router();
const { checkSchema } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  listBudgets, getBudgetSummary, getBudget,
  upsertBudget, updateBudget, deleteBudget,
} = require('../controllers/budgetController');

router.use(requireAuth);

const upsertSchema = {
  category:       { in: ['body'], isMongoId: { errorMessage: 'category must be a valid ID' } },
  limitAmount:    { in: ['body'], isFloat: { options: { min: 0.01 }, errorMessage: 'limitAmount must be a positive number' } },
  alertThreshold: { in: ['body'], optional: true, isFloat: { options: { min: 0.1, max: 1.0 }, errorMessage: 'alertThreshold must be between 0.1 and 1.0' } },
  month:          { in: ['body'], optional: true, isInt:   { options: { min: 1, max: 12 },   errorMessage: 'month must be 1–12' } },
  year:           { in: ['body'], optional: true, isInt:   { options: { min: 2000 },          errorMessage: 'year must be >= 2000' } },
};

// /summary must come before /:id to avoid route conflict
router.get('/summary', getBudgetSummary);

router.get('/',    listBudgets);
router.post('/',   checkSchema(upsertSchema), validateRequest, upsertBudget);
router.get('/:id', getBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
