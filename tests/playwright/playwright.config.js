import { defineConfig, devices } from '@playwright/test';

// APP_URL  = frontend base (port 80 on staging, 3000 locally)
// STAGING_URL is the backend API (port 5000); derive frontend from it when APP_URL is absent
const stagingApi = process.env.STAGING_URL || '';
const derivedAppUrl = stagingApi
  ? stagingApi.replace(/:5000$/, '').replace(/\/api$/, '')
  : 'http://localhost:3000';

// In CI the integration-test job runs `cd tests/playwright` first, so CWD is
// tests/playwright/ — outputFolder must step back two levels to land in the
// repo-root reports/ tree that the artifact uploader collects.
// Locally (no CI env) keep the report inside tests/playwright/playwright-report/.
const htmlReportDir = process.env.CI
  ? '../../reports/e2e/playwright-html'
  : 'playwright-report';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: htmlReportDir, open: 'never' }],
  ],
  use: {
    baseURL:      process.env.APP_URL || derivedAppUrl,
    headless:     true,
    screenshot:   'on',
    video:        'retain-on-failure',
    trace:        'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
