import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for running E2E tests against production (pyavchik.space).
 * No local webserver — tests hit the live site directly.
 *
 * Usage:
 *   npm run test:e2e:prod
 *   npm run test:e2e:prod -- --grep @smoke
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://pyavchik.space',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
