module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/db.js',
    '!src/config/passport.js',
    '!src/config/webpush.js',
  ],
};
