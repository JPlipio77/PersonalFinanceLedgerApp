const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    avatar: { type: String },
    // Local auth fields (optional — Google users won't have these)
    password:             { type: String, select: false },
    dateOfBirth:          { type: Date },
    country:              { type: String, trim: true },
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
    // Preferences
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
    pushAlerts:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
