# 🚀 Enterprise Test Automation Framework

An enterprise-ready, scalable End-to-End (E2E), Integration, and API test automation framework built with **TypeScript** and the official **Playwright Test Runner** (`@playwright/test`).

Architected using modern software engineering patterns:

- **Ports & Adapters (Hexagonal Architecture)** for backend infrastructure and third-party services.
- **Page Object Model (POM)** & **Component Object Model (COM)** for resilient web UI automation.
- **Dynamic Dependency Injection (Playwright Fixtures)** for zero-boilerplate test execution.
- **Dual Redis & Session Persistence** for fast, hermetic test runs.
- **Zero-Config Native Captcha & Proxy Management** without external paid service dependencies.

---

## 📑 Table of Contents

- [Architectural Highlights](#-architectural-highlights)
- [Hexagonal Backend Adapters](#-hexagonal-backend-adapters)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
- [Running Tests](#-running-tests)
- [Authentication & Session Management](#-authentication--session-management)
- [Network Proxy Management](#-network-proxy-management)
- [Native Captcha Solver](#-native-captcha-solver)
- [Code Quality & Clean Code Standards](#-code-quality--clean-code-standards)
- [Development Guide](#-development-guide)
- [Reports & CI/CD](#-reports--cicd)

---

## 🌟 Architectural Highlights

1. **Hexagonal Architecture (Ports & Adapters)**:
   - External dependencies (Databases, S3 storage, Redis caches, Mail inboxes, LLMs, Proxies, and Captcha solvers) are modeled as ports and adapters.
   - Built with resilient in-memory fallback stores so tests run reliably locally even when external containers or services are offline.
2. **Official Playwright Test Runner**:
   - Native parallel execution across workers, automated retries, trace recording on failure, video/screenshot captures, and interactive HTML reporting.
3. **Target SUT Isolation**:
   - Strict separation between the System Under Test (`targetDb`, `targetRedis`, `targetS3`) and the automation framework's internal runner services (`automationRedis`).
4. **Dynamic Data Factory**:
   - Generates randomized, collision-free test data (`src/factories/user.factory.ts`) to ensure 100% test hermeticity during concurrent execution.
5. **Zero-Config Native Security**:
   - Native solvers for Cloudflare Turnstile, Google reCAPTCHA v2, and drag-and-drop sliders without third-party paid API keys.

---

## 🔌 Hexagonal Backend Adapters

All adapters are auto-injected into test arguments via custom fixtures:

| Adapter                   | Fixture Name                     | Responsibility & Features                                                                                                        |
| :------------------------ | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **Target Database**       | `targetDb`                       | Executes SQL queries, seeds state, and manages automated connection lifecycles (`TARGET_DB_*`).                                  |
| **Dual Redis**            | `targetRedis`, `automationRedis` | Separates target app OTP/rate-limit state (`targetRedis` on 6380) from framework runner token cache (`automationRedis` on 6379). |
| **Target S3 Storage**     | `targetS3`                       | Uploads test receipts, validates file existence, checks document integrity, and generates presigned URLs.                        |
| **QA Email Provider**     | `mail` / `targetMail`            | Polls inboxes, parses activation links, and extracts OTPs (Supports `maildev`, `outlook` Graph API, `gmail`, `custom`).          |
| **LLM & AI Evaluation**   | `llm`                            | Chat completions and automated **LLM-as-a-Judge** response quality scoring against customizable criteria.                        |
| **2FA Authenticator**     | `totp`                           | RFC 6238 time-based one-time password generator for two-factor authentication flows.                                             |
| **Native Captcha Solver** | `captcha`                        | Zero-config Turnstile, reCAPTCHA v2, slider gesture physics, and DOM token injection (Ported from `super-power-automation`).     |
| **Proxy Management**      | `proxyAdapter`                   | Multi-format proxy parser, HTTP CONNECT pre-flight healthcheck, pool rotation, safe masking, and self-healing.                   |

---

## 📂 Project Directory Structure

```text
code-base-automation/
├── .github/
│   └── workflows/
│       └── playwright.yml         # CI/CD GitHub Actions pipeline
├── docs/
│   └── CLEAN_CODE_STANDARDS.md    # Clean Code rules, AAA pattern, anti-patterns
├── AGENTS.md                      # AI assistant developer guide & invariants
├── src/
│   ├── adapters/                  # Infrastructure & backend integration adapters
│   │   ├── database/              # Target database querying & connection pool
│   │   │   └── database.adapter.ts
│   │   ├── redis/                 # Dual Redis cache, OTP & rate limit helper
│   │   │   └── redis.adapter.ts
│   │   ├── s3/                    # Target S3 / MinIO storage & presigned URLs
│   │   │   └── s3.adapter.ts
│   │   ├── mail/                  # QA email inbox polling & OTP extraction
│   │   │   └── mail.adapter.ts
│   │   ├── llm/                   # AI Chatbot testing & LLM-as-a-Judge
│   │   │   └── llm.adapter.ts
│   │   ├── totp/                  # RFC 6238 2FA TOTP authenticator code generator
│   │   │   └── totp.adapter.ts
│   │   ├── captcha/               # Native zero-config Turnstile, reCAPTCHA & sliders
│   │   │   └── captcha.adapter.ts
│   │   ├── proxy/                 # Proxy pool rotation, healthcheck & self-healing
│   │   │   └── proxy.adapter.ts
│   │   ├── design/                # Figma, Penpot & Mock Design QA adapter
│   │   │   ├── design.port.ts
│   │   │   └── design.adapter.ts
│   │   └── index.ts
│   ├── config/                    # Environment & application configuration
│   │   ├── env.config.ts          # Type-safe .env loader
│   │   └── index.ts
│   ├── core/                      # Core framework abstraction layers
│   │   ├── BasePage.ts            # Base class for Page Objects (smart actions & asserts)
│   │   ├── BaseComponent.ts       # Base class for reusable UI widgets & modals
│   │   ├── ApiClient.ts           # Wrapper for Playwright APIRequestContext
│   │   ├── BrowserObserver.ts     # Console & network diagnostics observer
│   │   └── index.ts
│   ├── pages/                     # Page Object Model (POM)
│   │   ├── LoginPage.ts           # Login page object
│   │   ├── SecureAreaPage.ts      # Authenticated dashboard page object
│   │   ├── CheckboxesPage.ts      # Interactive form controls page object
│   │   └── components/            # Reusable UI components (AlertBanner, Navbar)
│   ├── fixtures/                  # Custom Playwright fixtures & dependency injection
│   │   ├── test.fixture.ts        # Auto-injected pages, adapters & logging
│   │   └── index.ts
│   ├── factories/                 # Dynamic test data generators
│   │   └── user.factory.ts        # Collision-free dynamic user credentials
│   └── utils/                     # Shared utilities
│       ├── logger.ts              # Colorized logger with timestamps & log levels
│       └── helpers.ts             # Randomizers, string masks, and screenshot helpers
├── tests/                         # Test suites
│   ├── setup/                     # Global setup project (authentication state)
│   │   └── auth.setup.ts          # Pre-authenticates user and dumps user.json
│   ├── e2e/                       # End-to-End browser UI tests
│   │   ├── auth.spec.ts           # Login & logout flow (isolated clean context)
│   │   ├── session-reuse.spec.ts  # Pre-authenticated dashboard access (storageState)
│   │   ├── interactive.spec.ts    # Form elements & interaction verification
│   │   └── diagnostics.spec.ts    # Console error & network diagnostics validation
│   ├── api/                       # REST API test suites
│   │   └── users.spec.ts          # API endpoints verification
│   └── integration/               # Backend adapter integration tests
│       ├── adapters.spec.ts       # Database, Redis, Mail, LLM, S3 & Proxy
│       └── security.spec.ts       # RFC 6238 2FA & Captcha solver verification
├── .env.example                   # Environment configuration template
├── docker-compose.yml             # Local Redis, MinIO, Browserless infrastructure
├── playwright.config.ts           # Central Playwright configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Framework documentation
```

---

## 🛠️ Getting Started

### 1. Prerequisites

- **Node.js**: `>= 20.0.0` (LTS recommended)
- **NPM**: `>= 9.0.0`

### 2. Installation

```bash
# Install dependencies
npm install

# Install Playwright browser binaries
npx playwright install chromium
```

### 3. Environment Setup

```bash
cp .env.example .env
```

_All adapters have built-in default values and fallback stores. You can immediately run tests without modifying `.env`._

---

## 🏃 Running Tests

| Command                      | Description                                                  |
| :--------------------------- | :----------------------------------------------------------- |
| `npm test`                   | Run all test suites in headless mode                         |
| `npm run test:headed`        | Run tests with browser window visible                        |
| `npm run test:ui`            | Open **Playwright Interactive UI Mode** (best for debugging) |
| `npm run test:debug`         | Launch tests in Playwright Inspector (step-by-step debug)    |
| `npm run test:e2e`           | Run E2E browser UI tests only                                |
| `npm run test:api`           | Run REST API tests only                                      |
| `npm run test:visual`        | Run pixel-by-pixel visual regression test suite              |
| `npm run test:visual:update` | Update golden baseline screenshots for visual regression     |
| `npm run perf:load`          | Run K6 containerized API load test scenario                  |
| `npm run perf:stress`        | Run K6 containerized stress capacity test scenario           |
| `npm run test:smoke`         | Run tests tagged with `@smoke`                               |
| `npm run test:regression`    | Run tests tagged with `@regression`                          |
| `npm run report`             | Open the last generated interactive HTML report              |

---

## 🔐 Authentication & Session Management

This framework implements two tiers of session optimization:

### 1. Browser-Level Session Reuse (`playwright/.auth/user.json`)

- **Global Setup (`tests/setup/auth.setup.ts`)**: Runs once prior to E2E tests, authenticates with valid credentials, and stores cookies & tokens in `playwright/.auth/user.json`.
- **Direct Authenticated Navigation**: E2E tests inherit this storage state automatically via `playwright.config.ts`, navigating directly to authenticated routes (`/secure`) without repeating login forms.
- **Clean Context Isolation**: When testing the login page or logout flows, override storage state explicitly:
  ```typescript
  test.use({ storageState: { cookies: [], origins: [] } });
  ```

### 2. Distributed Backend Session Caching (`automationRedis`)

- `automationRedis.setSession(id, sessionData, ttl)` caches authentication tokens across parallel workers.
- Separated from `targetRedis` to prevent test infrastructure pollution of SUT application data.

---

## 🌐 Network Proxy Management

The framework includes a zero-config `StandardProxyAdapter` (`proxyAdapter` fixture):

```typescript
import { test, expect } from '../fixtures';

test('Browser context using proxy rotation', async ({ browser, proxyAdapter }) => {
  // 1. Parse proxy from string or select from pool
  const proxyConfig = proxyAdapter.getPlaywrightProxy();

  // 2. Launch context with proxy (or direct if none configured)
  const context = await browser.newContext({ proxy: proxyConfig });
  const page = await context.newPage();

  try {
    await page.goto('https://api.ipify.org?format=json');
  } catch (err) {
    // 3. Self-healing: identify proxy failure and blacklist node
    if (proxyAdapter.isProxyError(err) && proxyConfig) {
      proxyAdapter.markProxyDead(proxyConfig, 'FAILED_TO_CONNECT');
      proxyAdapter.rotateProxy();
    }
    throw err;
  } finally {
    await context.close();
  }
});
```

---

## 🧩 Native Captcha Solver

Adopted from `super-power-automation`, the `BuiltinCaptchaSolverAdapter` resolves challenges with **zero third-party API keys**:

- **Cloudflare Turnstile**: `await captcha.solveTurnstile(page);`
- **Google reCAPTCHA v2**: `await captcha.solveRecaptchaV2(page);`
- **Slider Drag Physics**: `await captcha.solveSlider(page);`
- **Aliyun / Tencent Slider**: `await captcha.solveAliyunCaptcha(page);`
- **Arkose Labs / FunCaptcha**: `await captcha.solveArkoseDragCaptcha(page);`
- **DOM Token & Callback Injection**: `await captcha.injectToken(page, 'turnstile', token);`
- **Solution Watchers**: `await captcha.waitForCaptchaSolved(page);`

---

## 📸 Visual Regression Testing

Playwright provides pixel-by-pixel snapshot comparison to catch unintentional layout shifts and CSS regressions:

- **Component Snapshot**:
  ```typescript
  await pageObject.expectElementVisualSnapshot('#card', 'card-baseline.png');
  ```
- **Page Snapshot**:
  ```typescript
  await pageObject.expectVisualSnapshot('checkout-page.png');
  ```
- **Run Visual Tests**:
  ```bash
  npm run test:visual
  ```
- **Update Golden Baselines**:
  ```bash
  npm run test:visual:update
  ```

---

## 🎨 Design QA & Visual Fidelity (Figma & Penpot Integration)

The framework bridges the gap between Product Design and Automated QA through the **Design QA Provider Adapter** (`src/adapters/design/`):

- **Figma Integration**: Live REST API syncing for component images and design tokens.
- **Penpot Integration**: Native support for Penpot Cloud and self-hosted on-premise Docker instances.
- **Zero-Config Resilient Fallback**: Operates out-of-the-box with pre-seeded corporate tokens when API credentials are omitted.

### 1. Design Token Compliance Auditing

Validate live browser DOM computed styles against design system tokens (colors, font size, border radii, padding) without flaky pixel shifts:

```typescript
import { test, expect } from '../fixtures';

test('Button complies with Figma / Penpot design tokens', async ({ page, designAdapter }) => {
  const tokens = await designAdapter.getDesignTokens();

  const auditResult = await designAdapter.validateElementTokens(page.locator('#submit-btn'), {
    backgroundColor: tokens.colors.primary, // #3b82f6
    color: '#ffffff',
    borderRadius: tokens.borderRadius.md, // 8px
    fontSize: tokens.typography.button.fontSize, // 14px
    fontWeight: tokens.typography.button.fontWeight, // 600
  });

  expect(auditResult.valid).toBe(true);
});
```

### 2. Design-to-Test Component Image Export

Retrieve exported frame or component buffers directly from Figma/Penpot to feed into visual diff comparisons:

```typescript
const designFrameBuffer = await designAdapter.getComponentImage('auth-card-frame');
expect(designFrameBuffer).toBeDefined();
```

### 3. Configuration (.env)

```env
DESIGN_PROVIDER=mock          # 'figma' | 'penpot' | 'mock'
FIGMA_ACCESS_TOKEN=           # Personal Access Token
FIGMA_FILE_KEY=               # Figma File ID
PENPOT_BASE_URL=              # Default: https://design.penpot.app
PENPOT_TOKEN=                 # Penpot Access Token
PENPOT_FILE_ID=               # Penpot Project File ID
```

---

## ⚡ K6 Performance & Load Testing

Located in `tests/performance/`, this framework includes containerized K6 load scenarios:

- **Scenarios**:
  - `tests/performance/scenarios/api-load.js`: Evaluates response time (SLA: p95 < 500ms) under expected traffic.
  - `tests/performance/scenarios/stress-test.js`: Ramps up virtual users (10 -> 25 -> 50 VUs) to test breaking points.
- **Run via Docker Compose (Zero host installation)**:
  ```bash
  npm run perf:load    # Standard API throughput & SLA test
  npm run perf:stress  # High-traffic stress test
  ```

---

## 🛡️ Code Quality & Clean Code Standards

Strict clean code standards are enforced across all files:

```bash
# Check TypeScript type safety (0 errors)
npm run typecheck

# Check ESLint Playwright rules (0 errors, 0 warnings)
npm run lint

# Format code consistently
npm run format
```

Read [`docs/CLEAN_CODE_STANDARDS.md`](docs/CLEAN_CODE_STANDARDS.md) for full rules on:

- Eliminating hardcoded sleeps (`page.waitForTimeout` is forbidden).
- Enforcing the **AAA (Arrange-Act-Assert)** pattern.
- Keeping Page Objects pure (no locator leakage into spec files).
- Ensuring test hermeticity with dynamic data generation.

For AI assistants working in this repository, review [`AGENTS.md`](AGENTS.md).

---

## 💡 Development Guide

### 1. Creating a New Page Object

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class ProductPage extends BasePage {
  readonly pageHeading: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = this.page.locator('h1.product-title');
    this.checkoutButton = this.page.locator('button#checkout');
  }

  async open(productId: string): Promise<void> {
    await this.goto(`/products/${productId}`);
    await this.expectVisible(this.pageHeading);
  }

  async proceedToCheckout(): Promise<void> {
    await this.click(this.checkoutButton);
  }
}
```

### 2. Registering in Custom Fixtures

```typescript
// src/fixtures/test.fixture.ts
import { ProductPage } from '../pages/ProductPage';

export interface CustomFixtures {
  productPage: ProductPage;
}

export const test = baseTest.extend<CustomFixtures>({
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
});
```

### 3. Writing a Declarative Test Spec

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '../../src/fixtures';

test.describe('Product Checkout Flow', () => {
  test('User can select a product and proceed to checkout @smoke', async ({ productPage }) => {
    // 1. Arrange & Act
    await productPage.open('sku-1001');
    await productPage.proceedToCheckout();

    // 2. Assert
    await productPage.expectUrl(/checkout/);
  });
});
```

---

## 📊 Reports & CI/CD

- **HTML Report**: Run `npm run report` to view interactive test reports, step durations, screenshots, and videos.
- **Trace Viewer**: If a test fails, Playwright automatically records a full trace into `test-results/`.
- **CI/CD Pipeline**: GitHub Actions workflow at [.github/workflows/playwright.yml](.github/workflows/playwright.yml) runs on every push and pull request.
