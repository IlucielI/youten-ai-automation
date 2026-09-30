# AGENTS.md — AI Developer Guide for `code-base-automation`

This document defines the architectural invariants, engineering conventions, clean code rules, and operational workflows for AI coding assistants working in this repository.

---

## 1. Project Identity & Core Tech Stack

- **Purpose**: Enterprise-grade End-to-End (E2E), Integration, and API Test Automation Framework.
- **Language & Runtime**: TypeScript 5.7+ running on Node.js 22+.
- **Test Engine**: Playwright Test (`@playwright/test` 1.50+).
- **Architecture**:
  - **Hexagonal Architecture (Ports & Adapters)** for external infrastructure and test dependencies.
  - **Page Object Model (POM)** inheriting from `BasePage` and `BaseComponent`.
  - **Dynamic Test Fixtures** (`src/fixtures/test.fixture.ts`) injecting services and page objects on demand.
- **Code Quality**: Strict TypeScript compiler (`tsc --noEmit`), ESLint with `eslint-plugin-playwright`, and Prettier.

---

## 2. Architectural Invariants

### 2.1. Target SUT Services vs. Automation Internal Services

1. **Target SUT Services (Always prefixed with `target` or `TARGET_`)**:
   - The System Under Test (SUT) has its own backing infrastructure:
     - `targetDb` / `TARGET_DB_*`: Database queries, state seeding, data verification.
     - `targetRedis` / `TARGET_REDIS_*`: Target application OTPs, user rate limits.
     - `targetS3` / `TARGET_S3_*`: File uploads, receipts, policy documents, presigned download URLs.
2. **Automation Internal Services**:
   - `automationRedis` / `AUTOMATION_REDIS_*`: Internal cache for Playwright worker tokens, session storage, and test execution locks.
   - **Isolation Rule**: `automationRedis` must never share data or keys with `targetRedis`.
   - **Resilience Rule**: Both Redis and S3 adapters feature automatic in-memory fallback stores so tests remain resilient locally if containers are not running.

### 2.2. QA Mail / Email Provider Architecture

- Email is treated as a **QA Provider Inbox**, decoupled from target SUT database or target S3.
- Supported providers: `maildev` (local mock), `outlook` (Microsoft Graph API), `gmail`, `custom` (generic SMTP/IMAP), or simulated in-memory store.
- Never write credentials into `.env.example` or commit them to Git.

### 2.3. Zero-Config Security & Captcha Architecture

- **No Third-Party Paid Services**: Captcha resolution must NOT rely on external paid services (e.g., 2Captcha, CapSolver) or require environment variables (`CAPTCHA_API_KEY`).
- **Builtin Native Solver (`src/adapters/captcha/captcha.adapter.ts`)**:
  - Cloudflare Turnstile, Google reCAPTCHA v2, and slider physics (`solveSlider`, `solveAliyunCaptcha`, `solveArkoseDragCaptcha`).
  - DOM token injection (`injectToken`) into hidden response fields and client callbacks (`window.__aliyunCaptchaCallbacks`, `___grecaptcha_cfg`).
  - Watchers: `waitForCaptchaSolved`, `waitForQoderCaptchaSolved`, `verifySolved`.

### 2.4. Network Proxy Architecture (`src/adapters/proxy/proxy.adapter.ts`)

- Injected via fixture `proxyAdapter` (`StandardProxyAdapter`).
- Supports multi-format parsing (`http://`, `socks5://`, `host:port:user:pass`).
- Features pre-flight HTTP CONNECT socket healthchecks (`quickTestProxy`), credential masking (`maskProxy`), pool rotation, and self-healing (`isProxyError`, `markProxyDead`).
- Zero-config default: Defaults to Direct Connection mode when no proxy is configured.

### 2.5. Storage State & Authentication Reuse

- Global setup (`tests/setup/auth.setup.ts`) logs in once and saves storage state to `playwright/.auth/user.json`.
- Dependent project `chromium` automatically reuses storage state for session-dependent tests (e.g. `tests/e2e/session-reuse.spec.ts`).
- When testing the login page or authentication itself (e.g., `tests/e2e/auth.spec.ts`), tests **MUST** explicitly isolate the browser context:
  ```typescript
  test.use({ storageState: { cookies: [], origins: [] } });
  ```

### 2.6. Design QA & Visual Fidelity Architecture (`src/adapters/design/`)

- Injected via fixture `designAdapter` (or alias `design`).
- Multi-provider support: `figma` (Figma REST API), `penpot` (Penpot Cloud or self-hosted Docker), or `mock` (built-in corporate tokens).
- Capabilities:
  - **Token Compliance Audit** (`validateElementTokens`): Compares live computed styles (`window.getComputedStyle`) on DOM elements against design tokens (color, background, border-radius, font-size, font-weight).
  - **Color Normalization** (`normalizeColor`): Reliably compares shorthand hex, full hex, `rgb()`, `rgba()`, and named colors.
  - **Component Export Retrieval** (`getComponentImage`): Downloads or generates component PNG frames for visual diffing.
  - **Zero-Config Resilience**: When external tokens (`FIGMA_ACCESS_TOKEN`, `PENPOT_TOKEN`) are not configured, seamlessly falls back to pre-seeded corporate tokens without breaking tests.

---

## 3. Clean Code Rules & Anti-Patterns to Avoid

Follow [`docs/CLEAN_CODE_STANDARDS.md`](docs/CLEAN_CODE_STANDARDS.md) at all times:

1. **Strictly Forbidden: Arbitrary Sleep Loops**:
   - **NEVER** use `page.waitForTimeout()` in page objects or spec files (flagged by `playwright/no-wait-for-timeout`).
   - Use web-first assertions (`await expect(locator).toBeVisible()`) or state event polling.
   - The only exception is micro-delay pacing in simulated human drag gestures within captcha adapters (`sleep(100)`).
2. **Page Object Purity**:
   - Page Objects must only expose business actions (e.g. `loginPage.login(email, password)`).
   - Never expose raw locators or leaked Playwright internals into spec files.
   - Use `BasePage` helper methods (`goto`, `fill`, `click`, `expectVisible`) with smart waiting.
3. **Structured Test Pattern (AAA - Arrange, Act, Assert)**:
   - Every test must clearly follow Arrange -> Act -> Assert.
   - Always include meaningful test title tags (`@smoke`, `@regression`, `@adapter`, `@security`).
4. **Hermeticity & Collision-Free Test Data**:
   - Use `src/factories/user.factory.ts` (`generateUserData()`) or `randomEmail()` to ensure parallel workers never collide.
5. **No Hardcoded Secrets or IPs**:
   - Never commit API keys, client secrets, or private IPs to `.env.example` or code. Keep fallback placeholders blank.
6. **Zero Lint & Type Errors**:
   - All code must pass `npm run typecheck` (`tsc --noEmit`) and `npm run lint` (`eslint .`) with **0 errors and 0 warnings**.

---

## 4. Development Workflows for Agents

### Adding a New Page Object

1. Create `src/pages/<Name>Page.ts` extending `BasePage`.
2. Define private/readonly locators in the constructor using accessible selectors (`data-testid`, role, or semantic text).
3. Implement public business methods returning `Promise<void>` or target page objects.
4. Export the page object from `src/pages/index.ts`.
5. Register the page object in `CustomFixtures` within `src/fixtures/test.fixture.ts`.

### Adding a New Adapter

1. Create `src/adapters/<domain>/<domain>.adapter.ts`.
2. Define the interface contract (port) and concrete implementation (adapter).
3. Provide resilient in-memory or mock fallbacks when external connections or credentials are not configured.
4. Export the adapter from `src/adapters/index.ts`.
5. Register the adapter in `src/fixtures/test.fixture.ts`.
6. Add integration test coverage in `tests/integration/adapters.spec.ts`.

### Adding an E2E Test Spec

1. Create `tests/e2e/<feature>.spec.ts`.
2. Import `test, expect` from `../../src/fixtures` (never from `@playwright/test` directly).
3. Group related tests with `test.describe('Feature Name', () => { ... })`.
4. Inject page objects and adapters directly via test arguments.

---

## 5. Development & Verification Commands

Always run verification before concluding any task:

```bash
# 1. Typecheck TypeScript (Must be 0 errors)
npm run typecheck

# 2. Linting (Must be 0 errors and 0 warnings)
npm run lint

# 3. Format Code
npm run format

# 4. Run Full Test Suite
npm test

# 5. Run Targeted Suites
npx playwright test tests/e2e/                # E2E tests only
npx playwright test tests/api/                # API tests only
npx playwright test tests/integration/        # Backend & Security Adapters
npx playwright test --grep @smoke             # Smoke tests
npm run test:visual                           # Visual regression testing
npm run perf:load                             # K6 performance load test (via Docker)
```
