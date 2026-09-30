import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config';

const authFile = 'playwright/.auth/user.json';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : config.retries,
  workers: process.env.CI ? 1 : config.workers,
  timeout: config.defaultTimeout,
  expect: {
    timeout: config.expectTimeout,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: config.baseUrl,
    trace: config.traceOnFailure ? 'retain-on-failure' : 'off',
    screenshot: config.screenshotOnFailure ? 'only-on-failure' : 'off',
    video: config.videoOnFailure ? 'retain-on-failure' : 'off',
    viewport: config.viewport,
    headless: config.headless,
    launchOptions: {
      slowMo: config.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    actionTimeout: 15000,
    navigationTimeout: 30000,
    connectOptions: process.env.BROWSER_WS_ENDPOINT
      ? { wsEndpoint: process.env.BROWSER_WS_ENDPOINT }
      : undefined,
  },

  projects: [
    // 1. Global authentication setup (creates playwright/.auth/user.json)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 2. End-to-End browser tests (inherits pre-authenticated storageState)
    {
      name: 'chromium',
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // 3. REST API tests (isolated, fast execution without browser launch)
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
    },

    // 4. Infrastructure & Integration tests (Database, Redis, Mail, LLM, 2FA, Captcha)
    {
      name: 'integration',
      testMatch: /tests\/integration\/.*\.spec\.ts/,
    },
  ],

  outputDir: 'test-results',
});
