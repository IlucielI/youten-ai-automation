import { test, expect } from '../../src/fixtures';

test.describe('Browser Diagnostic & Error Monitoring', () => {
  test('Captures browser console errors, warnings, and network events @smoke @diagnostics', async ({
    page,
    browserObserver,
  }) => {
    await page.goto('/login');

    // 1. Simulate a frontend client-side console error and warning inside the browser
    await page.evaluate(() => {
      console.warn('Simulated client warning: Feature flag deprecated');
      console.error('Simulated frontend error: Failed to parse user profile response');
    });

    // 2. Verify the observer intercepted the logs
    const logs = browserObserver.getLogs();
    const errors = browserObserver.getErrors();

    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(errors.some((e) => e.message.includes('Failed to parse user profile response'))).toBe(
      true,
    );

    // 3. The logs are automatically attached to the Playwright HTML report on completion
  });
});
