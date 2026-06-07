const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    avatar: { type: String },
    password: { type: String, select: false },
    birthday: { type: Date },
    country: { type: String, trim: true },
    authProvider: { type: String, enum: ['google', 'local'], default: 'google' },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    currency: { type: String, default: 'PHP' },
    timezone: { type: String, default: 'UTC' },
    pushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
    emailAlerts: { type: Boolean, default: true },
    pushAlerts: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
