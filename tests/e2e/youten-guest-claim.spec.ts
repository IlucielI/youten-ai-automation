import { test, expect } from '../../src/fixtures';
import { UserFactory } from '../../src/factories/user.factory';

test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.YOUTEN_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
});

test.describe('Youten AI - Guest Recording Claim Journey @regression @youten', () => {
  test('Guest recording token in localStorage triggers auto-claim upon registration @smoke @claim', async ({
    page,
    youtenAuthPage,
    youtenDashboardPage,
  }) => {
    // 1. Arrange: Generate unique test credentials and pre-seed guest token in localStorage
    const user = UserFactory.createValidUser();
    const guestRecordingToken = 'guest_claim_token_999';

    await page.addInitScript((token) => {
      window.localStorage.setItem('youten_guest_token', token);
      window.localStorage.setItem('youten_guest_recording_id', 'rec_guest_claim_123');
    }, guestRecordingToken);

    // Mock API register endpoint with claim response
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'usr_claim_test_1',
              email: user.email,
              full_name: user.fullName,
            },
            claimed_recordings_count: 1,
          },
        }),
      });
    });

    // Mock Dashboard recordings API to confirm claimed recording is listed
    await page.route('**/api/recordings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: 'rec_guest_claim_123',
                title: 'Claimed Guest Audio',
                duration: 90,
                status: 'completed',
                created_at: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
          },
        }),
      });
    });

    // 2. Act: Navigate to registration page and submit form
    await youtenAuthPage.openRegister();
    await youtenAuthPage.register(user.fullName, user.email, user.password);

    // 3. Assert: Verification of redirection and claimed item visibility
    await page.goto('/dashboard');
    await expect(youtenDashboardPage.container).toBeVisible();
    await expect(page.locator('text=Claimed Guest Audio').first()).toBeVisible();
  });
});
