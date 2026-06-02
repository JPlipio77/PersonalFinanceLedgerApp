require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { passport, configurePassport } = require('./config/passport');

const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const categoriesRouter    = require('./routes/categories');
const transactionsRouter  = require('./routes/transactions');
const budgetsRouter       = require('./routes/budgets');
const notificationsRouter = require('./routes/notifications');
const dashboardRouter     = require('./routes/dashboard');
const recurringRouter     = require('./routes/recurring');
const reportsRouter       = require('./routes/reports');

const app = express();

// Security headers
app.use(helmet());

// CORS — allow frontend origin with credentials
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// HTTP request logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session — stored in MongoDB via connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    store:
      process.env.NODE_ENV !== 'test'
        ? MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
        : undefined,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Passport — configure strategies then initialise
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Web-push VAPID (no-op if keys not set)
require('./services/pushService').initWebPush();

// Global rate limiter
app.use(globalLimiter);

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/categories',    categoriesRouter);
app.use('/api/transactions',  transactionsRouter);
app.use('/api/budgets',       budgetsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/recurring',     recurringRouter);
app.use('/api/reports',       reportsRouter);

// Test-only: create a session for an existing user without going through OAuth
if (process.env.NODE_ENV === 'test') {
  const User = require('./models/User');
  app.post('/api/auth/test-login', express.json(), async (req, res) => {
    const user = await User.findById(req.body.userId).lean();
    if (!user) return res.status(404).json({ success: false });
    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ success: false });
      return res.json({ success: true });
    });
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralised error handler (must be last)
app.use(errorHandler);

module.exports = app;
