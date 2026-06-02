const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category:       { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    limitAmount:    { type: Number, required: true, min: 0.01 },
    currency:       { type: String, default: 'PHP' },
    month:          { type: Number, required: true, min: 1, max: 12 },
    year:           { type: Number, required: true },
    alertThreshold: { type: Number, default: 0.8, min: 0.1, max: 1.0 },
    alertSent:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One budget per user per category per month/year
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
