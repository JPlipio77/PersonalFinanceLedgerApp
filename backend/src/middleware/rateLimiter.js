const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// Pass-through middleware used in development — no limiting applied
const noLimit = (_req, _res, next) => next();

const globalLimiter = isDev
  ? noLimit
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });

const authLimiter = isDev
  ? noLimit
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many auth attempts, please try again later.' },
    });

module.exports = { globalLimiter, authLimiter };
