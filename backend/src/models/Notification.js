const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:            { type: String, enum: ['budget_alert', 'monthly_summary', 'system'], required: true },
    channel:         { type: String, enum: ['email', 'push', 'in_app'], required: true },
    title:           { type: String, required: true },
    message:         { type: String, required: true },
    isRead:          { type: Boolean, default: false },
    relatedBudget:   { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
    relatedCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    sentAt:          { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
