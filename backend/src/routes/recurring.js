const router = require('express').Router();
const { checkSchema } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  listRules, getRule, createRule, updateRule, deleteRule,
} = require('../controllers/recurringController');

router.use(requireAuth);

const ruleSchema = {
  type:        { in: ['body'], isIn: { options: [['income', 'expense']] }, errorMessage: 'type must be income or expense' },
  amount:      { in: ['body'], isFloat: { options: { min: 0.01 } }, toFloat: true, errorMessage: 'amount must be a positive number' },
  description: { in: ['body'], notEmpty: true, trim: true, isLength: { options: { max: 255 } }, errorMessage: 'description is required (max 255 chars)' },
  category:    { in: ['body'], notEmpty: true, isMongoId: true, errorMessage: 'category must be a valid ID' },
  frequency:   { in: ['body'], isIn: { options: [['daily', 'weekly', 'monthly', 'yearly']] }, errorMessage: 'frequency must be daily, weekly, monthly, or yearly' },
};

const patchSchema = {
  type:      { in: ['body'], optional: true, isIn: { options: [['income', 'expense']] } },
  amount:    { in: ['body'], optional: true, isFloat: { options: { min: 0.01 } }, toFloat: true },
  frequency: { in: ['body'], optional: true, isIn: { options: [['daily', 'weekly', 'monthly', 'yearly']] } },
  isActive:  { in: ['body'], optional: true, isBoolean: true, toBoolean: true },
};

router.get('/',     listRules);
router.get('/:id',  getRule);
router.post('/',    checkSchema(ruleSchema),  validateRequest, createRule);
router.put('/:id',  checkSchema(patchSchema), validateRequest, updateRule);
router.delete('/:id', deleteRule);

module.exports = router;
