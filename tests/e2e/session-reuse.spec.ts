import { test, expect } from '../../src/fixtures';

test.describe('Authentication Session Reuse', () => {
  test('User directly accesses protected Secure Area using persisted storage state @smoke @regression @session', async ({
    page,
    secureAreaPage,
  }) => {
    // 1. Act: Navigate directly to the protected route without filling the login form
    await page.goto('/secure');

    // 2. Assert: Verify the user is already authenticated via persisted storageState
    await secureAreaPage.expectLoggedIn();
    await expect(secureAreaPage.heading).toContainText('Secure Area');
    await expect(page).toHaveURL(/.*\/secure/);
  });
});
