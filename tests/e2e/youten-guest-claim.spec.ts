import { test, expect } from '../../src/fixtures';
import { UserFactory } from '../../src/factories/user.factory';

test.describe('Youten AI - Guest Recording Claim Journey @regression @youten', () => {
  test('Guest recording tokens trigger registration & dashboard renders claimed item @smoke @claim', async ({
    page,
    youtenAuthPage,
    youtenDashboardPage,
  }) => {
    // 1. Arrange: Seed guest tokens store in localStorage (matching Zustand persist schema)
    const user = UserFactory.createValidUser();
    const guestRecordingId = 'rec_guest_claim_123';
    const nowIso = new Date().toISOString();

    await page.addInitScript((recId) => {
      window.localStorage.setItem(
        'youten_guest_tokens',
        JSON.stringify({
          state: {
            guestTokens: [
              {
                id: recId,
                ownership_token: 'guest_claim_token_999',
                title: 'Claimed Guest Audio',
                created_at: new Date().toISOString(),
              },
            ],
            anonSession: null,
          },
          version: 0,
        }),
      );
    }, guestRecordingId);

    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            user: {
              id: 'usr_claim_test_1',
              email: user.email,
              full_name: user.fullName,
            },
          },
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'usr_claim_test_1',
            email: user.email,
            full_name: user.fullName,
            status: 'ACTIVE',
            email_verified: true,
            daily_quota: 5,
            quota_remaining: 4,
          },
        }),
      });
    });

    await page.route('**/api/workspaces*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    await page.route('**/api/folders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    await page.route('**/api/templates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    await page.route('**/api/recordings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            items: [
              {
                id: guestRecordingId,
                title: 'Claimed Guest Audio',
                original_filename: 'claimed-guest.mp3',
                duration_seconds: 90,
                status: 'COMPLETED',
                selected_template: 'GENERAL',
                created_at: nowIso,
              },
            ],
            pagination: {
              current_page: 1,
              page_size: 12,
              total_items: 1,
              total_pages: 1,
            },
          },
        }),
      });
    });

    // 2. Act: Register and then inspect dashboard
    await youtenAuthPage.openRegister();
    await youtenAuthPage.register(user.fullName, user.email, user.password);
    await expect(page).toHaveURL(/\/verify-email/);

    // 3. Assert: Dashboard displays claimed recording
    await youtenDashboardPage.open();
    await expect(page.locator('text=Claimed Guest Audio').first()).toBeVisible();
  });
});
