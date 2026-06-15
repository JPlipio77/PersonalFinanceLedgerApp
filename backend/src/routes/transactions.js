const router = require('express').Router();
const { checkSchema } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  listTransactions, getTransaction, createTransaction,
  updateTransaction, deleteTransaction, restoreTransaction,
  exportTransactions,
} = require('../controllers/transactionController');

router.use(requireAuth);

const createSchema = {
  type:        { in: ['body'], isIn: { options: [['income', 'expense']], errorMessage: 'type must be income or expense' } },
  amount:      { in: ['body'], isFloat: { options: { min: 0.01 }, errorMessage: 'amount must be a positive number' } },
  description: { in: ['body'], trim: true, notEmpty: { errorMessage: 'description is required' }, isLength: { options: { max: 255 } } },
  category:    { in: ['body'], isMongoId: { errorMessage: 'category must be a valid ID' } },
  date:        { in: ['body'], optional: true, isISO8601: { errorMessage: 'date must be a valid ISO date' } },
  currency:    { in: ['body'], optional: true, isLength: { options: { min: 3, max: 3 }, errorMessage: 'currency must be a 3-letter code' } },
};

const updateSchema = Object.fromEntries(
  Object.entries(createSchema).map(([k, v]) => [k, { ...v, optional: true }])
);

// /export must be defined before /:id to avoid route conflict
router.get('/export', exportTransactions);

router.get('/',     listTransactions);
router.post('/',    checkSchema(createSchema), validateRequest, createTransaction);
router.get('/:id',  getTransaction);
router.put('/:id',  checkSchema(updateSchema), validateRequest, updateTransaction);
router.delete('/:id',       deleteTransaction);
router.post('/:id/restore', restoreTransaction);

module.exports = router;
