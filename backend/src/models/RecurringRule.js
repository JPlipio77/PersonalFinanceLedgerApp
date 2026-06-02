const mongoose = require('mongoose');

const recurringRuleSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:        { type: String, enum: ['income', 'expense'], required: true },
    amount:      { type: Number, required: true, min: 0.01 },
    currency:    { type: String, default: 'PHP' },
    description: { type: String, required: true, trim: true, maxlength: 255 },
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    frequency:   { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, default: null },
    nextRunDate: { type: Date, required: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecurringRule', recurringRuleSchema);
