import { defineConfig, devices } from '@playwright/test';

// APP_URL  = frontend base (port 80 on staging, 3000 locally)
// STAGING_URL is the backend API (port 5000); derive frontend from it when APP_URL is absent
const stagingApi = process.env.STAGING_URL || '';
const derivedAppUrl = stagingApi
  ? stagingApi.replace(/:5000$/, '').replace(/\/api$/, '')
  : 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../reports/playwright', open: 'never' }],
  ],
  use: {
    baseURL:      process.env.APP_URL || derivedAppUrl,
    headless:     true,
    screenshot:   'only-on-failure',
    video:        'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
