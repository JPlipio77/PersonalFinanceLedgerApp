const router = require('express').Router();
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  listCategories, createCategory, updateCategory, deleteCategory,
} = require('../controllers/categoryController');

const nameRule = body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 });
const colorRule = body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color');

router.use(requireAuth);

router.get('/',    listCategories);
router.post('/',   nameRule, colorRule, validateRequest, createCategory);
router.put('/:id', nameRule.optional(), colorRule, validateRequest, updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
