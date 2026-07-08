# Personal Finance Ledger

A full-stack personal finance tracking application built with Node.js, Express, React, and MongoDB.

## Features

- **Ledger** — record income and expense transactions with date, amount, description, and category
- **Categories** — 14 predefined system categories + create your own custom ones
- **Budgets** — set monthly spending limits per category with real-time progress tracking
- **Alerts** — email + browser push notifications when spending exceeds configurable thresholds (default 80%)
- **Google OAuth** — secure login via Google account (no passwords stored)
- **Dashboard** — live charts: spending by category (bar), budget vs actual (donut), monthly trends (line)
- **Recurring transactions** — auto-post subscriptions, rent, salary on daily/weekly/monthly/yearly schedules
- **Multi-currency** — track amounts in any currency, normalized to USD via Open Exchange Rates
- **Export** — download transactions as CSV or Excel (XLSX)
- **Reports** — monthly and yearly summaries with income/expense charts and budget status
- **Dark mode** — toggle between light and dark themes, persisted in localStorage
- **Notifications** — in-app notification bell with unread badge and mark-all-read

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Backend    | Node.js 20 + Express 4                        |
| Frontend   | React 18 + Vite 5                             |
| Database   | MongoDB 7 + Mongoose 8                        |
| Auth       | Google OAuth 2.0 via Passport.js + sessions   |
| Email      | Nodemailer (SMTP / Gmail)                     |
| Push       | web-push (VAPID) + Service Worker             |
| Charts     | Recharts                                      |
| Scheduler  | node-cron (recurring transactions, monthly reset) |
| Testing    | Jest 29 + Supertest (backend), Jest + RTL (frontend) |
| DevOps     | Docker + docker-compose + GitHub Actions CI/CD |

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Google Cloud project with OAuth 2.0 credentials ([setup guide](https://developers.google.com/identity/protocols/oauth2))
- (Optional) [Open Exchange Rates](https://openexchangerates.org/) API key for live multi-currency rates

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone the repo
git clone <repo-url>
cd personalfinanceledgerapp

# 2. Create environment files
cp .env.example backend/.env
cp .env.example frontend/.env
# Edit backend/.env — fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET

# 3. Start all services (MongoDB + backend + frontend)
docker-compose up --build

# 4. Open the app
open http://localhost:3000
```

> **First run tip:** MongoDB starts first (health-checked), then backend seeds 14 system categories automatically.

---

## Local Development (without Docker)

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# Backend (terminal 1)
cd backend
cp ../.env.example .env   # fill in required vars
npm run dev               # nodemon — http://localhost:5000

# Frontend (terminal 2)
cd frontend
cp ../.env.example .env
npm run dev               # Vite HMR — http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `SESSION_SECRET` | Yes | Long random string for session signing |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth redirect URI (must match Google Console) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS + OAuth redirect |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | For email alerts | Any SMTP provider |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | For push alerts | See below |
| `OXR_APP_ID` | For live rates | [openexchangerates.org](https://openexchangerates.org) free tier |
| `VITE_API_BASE_URL` | Yes (frontend) | Backend API base URL |
| `VITE_VAPID_PUBLIC_KEY` | For push alerts | Same as `VAPID_PUBLIC_KEY` |

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
# Copy the output into backend/.env and frontend/.env
```

---

## Running Tests

```bash
# Backend — unit + integration tests
cd backend && npm test

# Backend — with coverage report (enforces ≥80% threshold)
cd backend && npm run test:coverage

# Frontend — component + page tests
cd frontend && npm test

# Watch mode (backend)
cd backend && npm run test:watch
```

Coverage reports are written to:
- `backend/coverage/` — HTML + lcov
- `frontend/coverage/` — HTML + lcov

**Coverage thresholds enforced in CI:** ≥ 80% lines, functions, and branches (backend).

### Test counts (Phase 7)

| Suite | Tests |
|---|---|
| Backend unit (services, middleware, jobs, utils) | 28 |
| Backend integration (all API endpoints) | 133 |
| Frontend (pages + components) | 37 |
| **Total** | **198** |

---

## API Reference

All API endpoints are prefixed with `/api`. No-auth health check at `GET /health`.

### Auth `/api/auth`
| Method | Path | Description |
|---|---|---|
| GET | `/google` | Initiate Google OAuth |
| GET | `/google/callback` | OAuth callback |
| POST | `/logout` | Log out |
| GET | `/me` | Current user profile |
| PUT | `/me` | Update preferences (currency, emailAlerts) |

### Transactions `/api/transactions`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List — pagination + 5 filters (type, category, dateRange, search) |
| POST | `/` | Create — triggers async budget alert check |
| GET | `/export` | Download CSV or XLSX (`?format=csv\|xlsx`) |
| GET | `/:id` | Get one |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Soft delete |
| POST | `/:id/restore` | Restore soft-deleted |

### Budgets `/api/budgets`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List for month (`?month=&year=`) |
| POST | `/` | Create / upsert |
| GET | `/summary` | All-category totals |
| GET | `/:id` | Single budget with spending enrichment |
| PUT | `/:id` | Update limit or threshold |
| DELETE | `/:id` | Delete |

### Recurring `/api/recurring`
Full CRUD for recurring transaction rules (daily/weekly/monthly/yearly).

### Reports `/api/reports`
| Method | Path | Description |
|---|---|---|
| GET | `/monthly` | Full monthly summary (`?month=&year=`) |
| GET | `/yearly` | Full yearly summary (`?year=`) |

### Dashboard `/api/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/overview` | Income, expense, net, budget adherence rate |
| GET | `/recent-transactions` | Last N transactions |
| GET | `/spending-by-category` | Category totals for current month |
| GET | `/trend` | Monthly income/expense for last N months |

---

## Docker Commands

```bash
# Start full stack (dev — with hot reload)
docker-compose up --build

# Start only MongoDB (run services locally)
docker-compose up mongo

# Production build (nginx + optimised images)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

# Tear down (keep volumes)
docker-compose down

# Tear down and wipe DB
docker-compose down -v
```

---

## Project Structure

```
personalfinanceledgerapp/
├── .github/workflows/
│   ├── ci.yml          # lint + test (coverage) + docker build on every push
│   └── deploy.yml      # build + push to GHCR on main
├── backend/
│   ├── src/
│   │   ├── config/     # db.js, passport.js, webpush.js
│   │   ├── controllers/# auth, transactions, categories, budgets,
│   │   │               # notifications, dashboard, recurring, reports
│   │   ├── jobs/       # recurringTransactions.js (node-cron)
│   │   ├── middleware/  # authMiddleware, errorHandler, rateLimiter, validateRequest
│   │   ├── models/     # User, Transaction, Category, Budget, Notification, RecurringRule
│   │   ├── routes/     # one file per resource
│   │   ├── services/   # alertService, emailService, pushService, currencyService, exportService
│   │   └── utils/      # asyncHandler, apiResponse, logger, seedCategories
│   ├── tests/
│   │   ├── integration/# full HTTP round-trips against in-memory MongoDB
│   │   ├── unit/       # services, middleware, jobs, utils in isolation
│   │   └── helpers/    # authHelper, dbHelper
│   ├── jest.config.js  # coverage thresholds ≥80%
│   └── Dockerfile      # dev + prod multi-stage
├── frontend/
│   ├── public/
│   │   └── sw.js       # Service Worker for push notifications
│   ├── src/
│   │   ├── api/        # axiosInstance + per-resource API modules
│   │   ├── components/ # Navbar, Sidebar, charts, notifications, common
│   │   ├── context/    # AuthContext, ThemeContext
│   │   ├── hooks/      # useTransactions, useBudgets, useCategories, useRecurring, etc.
│   │   ├── pages/      # Login, Dashboard, Transactions, Budgets,
│   │   │               # Categories, Reports, Settings
│   │   ├── router/     # AppRouter with PrivateRoute guard
│   │   ├── styles/     # globals.css, theme.css (light/dark CSS variables)
│   │   └── utils/      # formatCurrency, formatDate
│   ├── tests/
│   │   ├── components/ # Navbar, TransactionForm, BudgetCard
│   │   └── pages/      # Login, Dashboard, Reports, Settings
│   ├── jest.config.js
│   ├── vite.config.js
│   └── Dockerfile      # dev + build + prod (nginx) multi-stage
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx.conf          # SPA fallback + /api proxy + static caching
└── .env.example
```

---

## CI/CD

### `ci.yml` — triggers on every push / PR
1. **backend-test** — `npm ci` → lint → `npm run test:coverage` (enforces ≥80% branches)
2. **frontend-test** — `npm ci` → lint → `npm run test:coverage`
3. **docker-build-check** — `docker compose build` smoke test (needs both test jobs)

### `deploy.yml` — triggers on push to `main`
1. Builds backend and frontend Docker images (prod targets) with layer caching
2. Pushes to GitHub Container Registry (`ghcr.io/<org>/<repo>/backend:latest` + SHA tag)
3. Optionally triggers a staging deploy via `DEPLOY_HOOK_URL` secret
4. Writes a deploy summary to the GitHub Actions run

### Pull images
```bash
docker pull ghcr.io/<your-org>/<your-repo>/backend:latest
docker pull ghcr.io/<your-org>/<your-repo>/frontend:latest
```

---

## Security Notes

- Sessions stored in MongoDB via `connect-mongo`; cookies are `httpOnly`, `sameSite: lax`, `secure` in production
- All routes protected by `requireAuth` middleware (except `/health` and OAuth endpoints)
- Rate limiting via `express-rate-limit`: 200 req/15 min globally, 20 req/15 min on auth routes
- Input validation via `express-validator` `checkSchema()` on all write endpoints
- `helmet()` sets security headers (XSS protection, HSTS, CSP, etc.)
- Soft delete pattern preserves financial audit trail; no permanent deletes exposed
- No customer PII included in API responses or data exports
- Push subscription VAPID keys generated per deployment; expired subscriptions (HTTP 410) auto-cleaned

---

## Implementation Phases

| Phase | Description | Tests |
|---|---|---|
| 1 | Project scaffolding + Docker + CI | — |
| 2 | MongoDB models + Google OAuth | 13 |
| 3 | Categories + Transactions CRUD | 30 |
| 4 | Budget management + alert system | 17 |
| 5 | Dashboard + charts | 17 |
| 6 | Recurring transactions, multi-currency, reports, settings | 41 |
| 7 | Coverage ≥ 80%, prod Docker, CI/CD polish | 80 (added) |

---

## License

MIT
