import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
}

export interface MailConfig {
  provider: 'maildev' | 'outlook' | 'gmail' | 'custom';
  maildevUrl: string;
  outlook: {
    clientId: string;
    clientSecret?: string;
    refreshToken?: string;
  };
  gmail: {
    clientId: string;
    clientSecret?: string;
    refreshToken?: string;
  };
  smtp: {
    host: string;
    port: number;
    user?: string;
    password?: string;
  };
  imap: {
    host?: string;
    port: number;
    user?: string;
    password?: string;
  };
  skipEmail: boolean;
}

export interface DesignConfig {
  provider: 'figma' | 'penpot' | 'mock';
  figma: {
    accessToken?: string;
    fileKey?: string;
  };
  penpot: {
    baseUrl?: string;
    token?: string;
    fileId?: string;
  };
}

export interface AppConfig {
  env: string;
  baseUrl: string;
  apiBaseUrl: string;
  browser: 'chromium' | 'firefox' | 'webkit' | 'chrome';
  headless: boolean;
  slowMo: number;
  defaultTimeout: number;
  expectTimeout: number;
  viewport: {
    width: number;
    height: number;
  };
  retries: number;
  workers: number;
  screenshotOnFailure: boolean;
  videoOnFailure: boolean;
  traceOnFailure: boolean;
  captureBrowserLogs: boolean;
  testCredentials: {
    userEmail: string;
    userPassword: string;
  };

  // Target SUT Services (Target application dependencies)
  targetDb: DatabaseConfig;
  targetRedis: RedisConfig;
  targetS3: S3Config;

  // Automation Framework Internal Services & QA Inbox Provider
  automationRedis: RedisConfig;
  mail: MailConfig;

  // Backward-compatible aliases
  db: DatabaseConfig;
  redis: RedisConfig;
  s3: S3Config;
  targetMail: MailConfig;

  // Design QA & Visual Fidelity Provider
  design: DesignConfig;

  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export const config: AppConfig = {
  env: process.env.ENV || 'local',
  baseUrl: process.env.BASE_URL || 'https://the-internet.herokuapp.com',
  apiBaseUrl: process.env.API_BASE_URL || 'https://reqres.in/api',
  browser: (process.env.BROWSER as any) || 'chromium',
  headless: process.env.HEADLESS !== 'false',
  slowMo: Number(process.env.SLOW_MO || 0),
  defaultTimeout: Number(process.env.DEFAULT_TIMEOUT || 30000),
  expectTimeout: Number(process.env.EXPECT_TIMEOUT || 10000),
  viewport: {
    width: Number(process.env.VIEWPORT_WIDTH || 1366),
    height: Number(process.env.VIEWPORT_HEIGHT || 768),
  },
  retries: Number(process.env.RETRIES || 0),
  workers: Number(process.env.WORKERS || 2),
  screenshotOnFailure: process.env.SCREENSHOT_ON_FAILURE !== 'false',
  videoOnFailure: process.env.VIDEO_ON_FAILURE === 'true',
  traceOnFailure: process.env.TRACE_ON_FAILURE !== 'false',
  captureBrowserLogs: process.env.CAPTURE_BROWSER_LOGS !== 'false',
  testCredentials: {
    userEmail: process.env.TEST_USER_EMAIL || 'user@example.com',
    userPassword: process.env.TEST_USER_PASSWORD || 'SecretPassword123!',
  },

  // Target Application (SUT) Backing Services
  targetDb: {
    host: process.env.TARGET_DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.TARGET_DB_PORT || process.env.DB_PORT || 5432),
    user: process.env.TARGET_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.TARGET_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database: process.env.TARGET_DB_NAME || process.env.DB_NAME || 'test_db',
  },
  targetRedis: {
    host: process.env.TARGET_REDIS_HOST || 'localhost',
    port: Number(process.env.TARGET_REDIS_PORT || 6380),
    password: process.env.TARGET_REDIS_PASSWORD || undefined,
    db: Number(process.env.TARGET_REDIS_DB || 0),
  },
  targetS3: {
    endpoint: process.env.TARGET_S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.TARGET_S3_REGION || 'us-east-1',
    bucket: process.env.TARGET_S3_BUCKET || 'target-app-uploads',
    accessKeyId: process.env.TARGET_S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.TARGET_S3_SECRET_ACCESS_KEY || 'minioadmin',
    forcePathStyle: process.env.TARGET_S3_FORCE_PATH_STYLE !== 'false',
  },

  // Automation Framework Internal Services
  automationRedis: {
    host: process.env.AUTOMATION_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.AUTOMATION_REDIS_PORT || process.env.REDIS_PORT || 6379),
    password: process.env.AUTOMATION_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.AUTOMATION_REDIS_DB || process.env.REDIS_DB || 0),
  },

  // QA Email / Inbox Provider (Outlook, Gmail, Custom IMAP/SMTP, Maildev)
  mail: {
    provider: (process.env.EMAIL_PROVIDER as any) || 'maildev',
    maildevUrl: process.env.MAILDEV_URL || 'http://127.0.0.1:1080',
    outlook: {
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
      refreshToken: process.env.OUTLOOK_REFRESH_TOKEN || '',
    },
    gmail: {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    },
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT || 1025),
      user: process.env.SMTP_USER || undefined,
      password: process.env.SMTP_PASSWORD || undefined,
    },
    imap: {
      host: process.env.IMAP_HOST || undefined,
      port: Number(process.env.IMAP_PORT || 993),
      user: process.env.IMAP_USER || undefined,
      password: process.env.IMAP_PASSWORD || undefined,
    },
    skipEmail: process.env.SKIP_EMAIL === 'true',
  },

  // Backward-compatible aliases
  get db() {
    return this.targetDb;
  },
  get redis() {
    return this.automationRedis;
  },
  get s3() {
    return this.targetS3;
  },
  get targetMail() {
    return this.mail;
  },

  // Design QA & Visual Fidelity Provider (Figma, Penpot, or Mock)
  design: {
    provider: (process.env.DESIGN_PROVIDER as any) || 'mock',
    figma: {
      accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
      fileKey: process.env.FIGMA_FILE_KEY || '',
    },
    penpot: {
      baseUrl: process.env.PENPOT_BASE_URL || 'https://design.penpot.app',
      token: process.env.PENPOT_TOKEN || '',
      fileId: process.env.PENPOT_FILE_ID || '',
    },
  },

  llm: {
    baseUrl: process.env.LLM_BASE_URL || '',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || '',
    temperature: Number(process.env.LLM_TEMPERATURE || 0.7),
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 1000),
  },
};

export default config;
