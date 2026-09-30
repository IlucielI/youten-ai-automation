# 📐 Clean Code Standards for Test Automation

This document defines the software engineering and code quality standards for this test automation repository. Adhering to these principles ensures that our test suite remains reliable, resilient against flakiness, fast, and easy to maintain.

---

## 1. Core Principles (Golden Rules)

### A. Separation of "What" vs. "How"

- **Test Specifications (`tests/**/*.spec.ts`)**: Must only describe **WHAT** is being verified (business intent, user journey, and acceptance criteria from a human perspective).
- **Page Objects (`src/pages/**/*.ts`)**: Encapsulate **HOW** to interact with the web interface (finding elements, clicking, filling inputs, and scrolling).
- **Adapters (`src/adapters/**/*.ts`)**: Encapsulate **HOW** to communicate with infrastructure (Database, Redis, SMTP/Mail Server, and LLM services).

### B. AAA Pattern (Arrange - Act - Assert)

Every test scenario must be structured into three distinct and unambiguous phases:

```typescript
test('User can register for an insurance policy and receive confirmation @smoke', async ({
  registerPage,
  mail,
}) => {
  // 1. ARRANGE: Prepare isolated, non-colliding test data
  const applicant = UserFactory.createApplicant();

  // 2. ACT: Execute user interactions via Page Objects
  await registerPage.open();
  await registerPage.submitApplication(applicant);

  // 3. ASSERT: Verify the expected outcomes (UI and Email state)
  await expect(registerPage.successAlert).toBeVisible();
  const email = await mail.waitForEmail(applicant.email);
  expect(email.subject).toContain('Policy Activated');
});
```

### C. Hermetic & Isolated Tests (Zero Inter-Test Dependency)

- **Never allow Test B to depend on the execution or outcome of Test A**.
- Tests must be completely independent and capable of running in parallel in any arbitrary order.
- Each test must generate its own test data (via Dynamic Data Factories or API/DB seeding) and clean up after itself when needed.

### D. DAMP over DRY (Descriptive And Meaningful Phrases)

- In production application code, strict **DRY** (_Don't Repeat Yourself_) is paramount.
- In test automation code, **DAMP** takes precedence: test clarity and narrative flow must not be sacrificed for excessive abstraction.
- An engineer reading a failing test must be able to understand the scenario from top to bottom without having to navigate through multiple layers of indirection.

---

## 2. 🚫 Forbidden Anti-Patterns

| Anti-Pattern                                      | Why It Is Harmful                                                                  | Clean Solution                                                                   |
| :------------------------------------------------ | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| `sleep(5000)` / `waitForTimeout()`                | Makes test suites slow and remains inherently flaky under network variation        | Use web-first auto-retrying assertions (`await expect(locator).toBeVisible()`)   |
| Fragile raw XPath (`//div[2]/table/tr[3]`)        | Breaks whenever developers refactor intermediate containers or styling             | Use user-facing locators (`getByRole()`, `getByLabel()`) or `data-testid`        |
| Missing `await` keyword                           | Playwright operations are asynchronous; missing `await` causes silent passing bugs | Enforced automatically by ESLint rule `playwright/valid-expect`                  |
| Manual DB / Cache connections in tests            | Leaks connection handles and bloats test specifications                            | Inject managed adapters via Playwright fixtures (`src/fixtures/test.fixture.ts`) |
| Static hardcoded credentials (`"test@gmail.com"`) | Triggers data collision errors when tests run in parallel                          | Use Dynamic Data Factories (`UserFactory.createApplicant()`)                     |
| Testing through UI for simple data setup          | Slows down test execution by 10x-50x                                               | Use `ApiClient` or `db` adapter to seed data directly before opening UI          |

---

## 3. 🎯 Resilient Locator Hierarchy

When defining locators in Page Objects, prioritize locators based on how users interact with the application:

1. **Accessibility / User Role (Highest Priority)**:
   - `page.getByRole('button', { name: 'Submit' })`
   - `page.getByRole('heading', { name: 'Secure Area' })`
2. **Form Label & Placeholder**:
   - `page.getByLabel('Email address')`
   - `page.getByPlaceholder('Enter your password')`
3. **Explicit QA Test Attributes (Contract between QA & Frontend)**:
   - `page.locator('[data-testid="submit-application-btn"]')`
4. **Text Content**:
   - `page.getByText('Application successfully submitted')`
5. **CSS Class / Structural Selectors (Lowest Priority - Use with Caution)**:
   - Avoid framework-generated classes (e.g. `.css-19z8a`, `.tailwind-dynamic-hash`).

---

## 4. 🛡️ Automated Code Quality & Linting

Our repository enforces Clean Code standards through automated scripts:

```bash
# Scan codebase for anti-patterns and linting violations
npm run lint

# Automatically resolve fixable linting issues
npm run lint:fix

# Format all TypeScript, JavaScript, JSON, and Markdown files
npm run format

# Verify TypeScript type correctness without emitting output
npm run typecheck
```
