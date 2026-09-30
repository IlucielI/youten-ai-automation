import { test, expect } from '../../src/fixtures';

// Isolate authentication tests with a clean, unauthenticated browser context
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication & Session Management', () => {
  test('User can successfully login with valid credentials and logout @smoke @regression', async ({
    loginPage,
    secureAreaPage,
  }) => {
    // 1. Arrange & Act: Navigate and login
    await loginPage.open();
    await loginPage.login('tomsmith', 'SuperSecretPassword!');

    // 2. Assert: Verify authenticated dashboard state
    await expect(secureAreaPage.heading).toContainText('Secure Area');
    await expect(secureAreaPage.alertBanner.messageText).toContainText(
      'You logged into a secure area!',
    );

    // 3. Act & Assert: Logout and verify redirect
    await secureAreaPage.logout();
    await expect(loginPage.alertBanner.messageText).toContainText(
      'You logged out of the secure area!',
    );
  });

  test('User receives error feedback when providing invalid credentials @regression', async ({
    loginPage,
  }) => {
    // 1. Arrange & Act: Attempt login with invalid credentials
    await loginPage.open();
    await loginPage.login('invalid_user', 'WrongPassword123!');

    // 2. Assert: Verify error alert notification
    await expect(loginPage.alertBanner.messageText).toContainText('Your username is invalid!');
  });
});
