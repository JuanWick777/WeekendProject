import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-landscape',
      use: {
        ...devices['Pixel 7 landscape'],
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '3100',
      APP_ORIGIN: 'http://127.0.0.1:3100',
      // Nunca heredar la base de desarrollo/producción de .env para E2E.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
    },
  },
});
