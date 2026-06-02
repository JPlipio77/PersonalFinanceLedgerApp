const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const { success, created, error } = require('../utils/apiResponse');

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    $or: [{ isSystem: true }, { userId: req.user._id }],
  }).sort({ isSystem: -1, name: 1 });
  return success(res, categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, color } = req.body;
  const existing = await Category.findOne({ name, userId: req.user._id, isSystem: false });
  if (existing) return error(res, 'Category with this name already exists', 409);

  const category = await Category.create({
    name,
    icon: icon || '📁',
    color: color || '#6b7280',
    isSystem: false,
    userId: req.user._id,
  });
  return created(res, category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return error(res, 'Category not found', 404);
  if (category.isSystem) return error(res, 'System categories cannot be modified', 403);
  if (!category.userId.equals(req.user._id)) return error(res, 'Forbidden', 403);

  const { name, icon, color } = req.body;
  if (name) category.name = name;
  if (icon) category.icon = icon;
  if (color) category.color = color;
  await category.save();
  return success(res, category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return error(res, 'Category not found', 404);
  if (category.isSystem) return error(res, 'System categories cannot be deleted', 403);
  if (!category.userId.equals(req.user._id)) return error(res, 'Forbidden', 403);

  const txCount = await Transaction.countDocuments({
    userId: req.user._id,
    category: category._id,
    isDeleted: false,
  });
  if (txCount > 0) {
    return error(res, `Cannot delete: ${txCount} transaction(s) use this category`, 409);
  }

  await category.deleteOne();
  return success(res, null, 'Category deleted');
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
