import { test as baseTest, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SecureAreaPage } from '../pages/SecureAreaPage';
import { CheckboxesPage } from '../pages/CheckboxesPage';
import { ApiClient } from '../core/ApiClient';
import { SqlDatabaseAdapter, DatabaseAdapter } from '../adapters/database/database.adapter';
import { LlmAdapter } from '../adapters/llm/llm.adapter';
import { RedisCacheAdapter, RedisAdapter } from '../adapters/redis/redis.adapter';
import { SmtpMailAdapter, MailAdapter } from '../adapters/mail/mail.adapter';
import { StandardTotpAdapter, TotpAdapter } from '../adapters/totp/totp.adapter';
import { BuiltinCaptchaSolverAdapter, CaptchaAdapter } from '../adapters/captcha/captcha.adapter';
import { AwsS3StorageAdapter, S3Adapter } from '../adapters/s3/s3.adapter';
import { StandardProxyAdapter, ProxyAdapter } from '../adapters/proxy/proxy.adapter';
import { createDesignAdapter, DesignAdapter } from '../adapters/design/design.adapter';
import { BrowserObserver } from '../core/BrowserObserver';
import { UserService } from '../services/UserService';
import { config } from '../config';
import Logger from '../utils/logger';

/**
 * Custom fixture types extending Playwright's default test context
 */
export interface CustomFixtures {
  loginPage: LoginPage;
  secureAreaPage: SecureAreaPage;
  checkboxesPage: CheckboxesPage;
  apiClient: ApiClient;
  userService: UserService;

  // Target Application (SUT) Adapters (prefixed with target)
  targetDb: DatabaseAdapter;
  targetRedis: RedisAdapter;
  targetS3: S3Adapter;
  targetMail: MailAdapter;

  // Automation Framework Internal Adapters
  automationRedis: RedisAdapter;

  // Aliases for convenience & backward compatibility
  db: DatabaseAdapter;
  redis: RedisAdapter;
  s3: S3Adapter;
  mail: MailAdapter;

  // Security, AI & Design QA Adapters
  totp: TotpAdapter;
  captcha: CaptchaAdapter;
  llm: LlmAdapter;
  proxyAdapter: ProxyAdapter;
  designAdapter: DesignAdapter;
  design: DesignAdapter;
  browserObserver: BrowserObserver;
  autoLog: void;
}

export const test = baseTest.extend<CustomFixtures>({
  // Browser diagnostic observer
  browserObserver: async ({}, use) => {
    await use(new BrowserObserver());
  },

  // Automatically attach diagnostic listener to every browser page
  page: async ({ page, browserObserver }, use, testInfo) => {
    browserObserver.attach(page);
    await use(page);
    browserObserver.attachToTestReport(testInfo);
  },

  // 2FA TOTP Generator Adapter (RFC 6238)
  totp: async ({}, use) => {
    await use(new StandardTotpAdapter());
  },

  // Native Built-in Captcha Solver Adapter (Zero Third-Party / Zero Config)
  captcha: async ({}, use) => {
    await use(new BuiltinCaptchaSolverAdapter());
  },

  // Network Proxy Management Adapter (Rotation, Pre-flight Healthcheck & Self-healing)
  proxyAdapter: async ({}, use) => {
    await use(new StandardProxyAdapter());
  },

  // Design QA & Visual Fidelity Adapter (Figma, Penpot, or Zero-Config Mock)
  designAdapter: async ({}, use) => {
    await use(createDesignAdapter());
  },

  // Alias for designAdapter
  design: async ({ designAdapter }, use) => {
    await use(designAdapter);
  },

  // Auto-initialized Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  secureAreaPage: async ({ page }, use) => {
    await use(new SecureAreaPage(page));
  },

  checkboxesPage: async ({ page }, use) => {
    await use(new CheckboxesPage(page));
  },

  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request, config.apiBaseUrl));
  },

  // Service Object Model (SOM) for API testing
  userService: async ({ apiClient }, use) => {
    await use(new UserService(apiClient));
  },

  // Target Application Database Adapter fixture (with automated lifecycle)
  targetDb: async ({}, use) => {
    const dbAdapter = new SqlDatabaseAdapter();
    await dbAdapter.connect();
    await use(dbAdapter);
    await dbAdapter.disconnect();
  },

  // Default db fixture (alias to targetDb)
  db: async ({ targetDb }, use) => {
    await use(targetDb);
  },

  // Automation Runner Redis fixture (internal runner cache, session tokens, locks)
  automationRedis: async ({}, use) => {
    const redisAdapter = new RedisCacheAdapter(config.automationRedis, 'Automation');
    await redisAdapter.connect();
    await use(redisAdapter);
    await redisAdapter.disconnect();
  },

  // Target SUT Redis fixture (business logic, real user OTPs, rate-limit counters)
  targetRedis: async ({}, use) => {
    const redisAdapter = new RedisCacheAdapter(config.targetRedis, 'Target-SUT');
    await redisAdapter.connect();
    await use(redisAdapter);
    await redisAdapter.disconnect();
  },

  // Default redis fixture (points to automationRedis for backward compatibility)
  redis: async ({ automationRedis }, use) => {
    await use(automationRedis);
  },

  // Target SUT S3 Storage Adapter fixture (uploads, receipts, claims, documents)
  targetS3: async ({}, use) => {
    const s3Adapter = new AwsS3StorageAdapter(config.targetS3);
    await s3Adapter.connect();
    await use(s3Adapter);
    await s3Adapter.disconnect();
  },

  // Default s3 fixture (alias to targetS3)
  s3: async ({ targetS3 }, use) => {
    await use(targetS3);
  },

  // QA Email / Inbox Provider fixture (Outlook Graph API, Gmail, Custom SMTP/IMAP, Maildev)
  mail: async ({}, use) => {
    const mailAdapter = new SmtpMailAdapter();
    await mailAdapter.connect();
    await use(mailAdapter);
    await mailAdapter.disconnect();
  },

  // Backward-compatible alias
  targetMail: async ({ mail }, use) => {
    await use(mail);
  },

  // LLM / AI Evaluation Adapter fixture
  llm: async ({}, use) => {
    const llmAdapter = new LlmAdapter();
    await use(llmAdapter);
  },

  // Auto fixture for test lifecycle logging
  autoLog: [
    async ({}, use, testInfo) => {
      const title = testInfo.title;
      Logger.section(`STARTING TEST: ${title}`);
      const startTime = Date.now();

      await use();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (testInfo.status === 'passed') {
        Logger.success(`PASSED: ${title} (${duration}s)`);
      } else {
        Logger.error(`FAILED: ${title} (${duration}s)`);
      }
    },
    { auto: true },
  ],
});

export { expect };
export default test;
