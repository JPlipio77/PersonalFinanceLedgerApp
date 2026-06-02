const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '📁' },
    color: { type: String, default: '#6b7280' },
    isSystem: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Unique: one custom category per name per user; system categories are unique by name
categorySchema.index(
  { name: 1, userId: 1, isSystem: 1 },
  { unique: true, partialFilterExpression: { isSystem: false } }
);
categorySchema.index({ isSystem: 1 });

module.exports = mongoose.model('Category', categorySchema);
