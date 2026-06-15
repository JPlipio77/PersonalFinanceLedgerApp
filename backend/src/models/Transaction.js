const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:        { type: String, enum: ['income', 'expense'], required: true },
    amount:      { type: Number, required: true, min: 0.01 },
    currency:    { type: String, default: 'PHP' },
    amountUSD:   { type: Number },          // normalized for multi-currency aggregation
    description: { type: String, required: true, trim: true, maxlength: 255 },
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    date:        { type: Date, required: true, default: Date.now },
    isRecurring: { type: Boolean, default: false },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringRule', default: null },
    isDeleted:   { type: Boolean, default: false, index: true },
    deletedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, isDeleted: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
