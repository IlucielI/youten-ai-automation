import { test, expect } from '../../src/fixtures';

// Isolate context for guest user journey
test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.YOUTEN_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
});

test.describe('Youten AI - Guest Ingestion & Workspace Journey @smoke @youten', () => {
  test('Guest can inspect landing page, switch to URL input, and navigate workspace @guest @smoke', async ({
    youtenLandingPage,
  }) => {
    // 1. Arrange: Open Landing Page
    await youtenLandingPage.open();

    // 2. Assert: Verify hero components and upload triggers
    await expect(youtenLandingPage.heroHeading).toBeVisible();
    await expect(youtenLandingPage.fileInput).toBeAttached();

    // 3. Act: Switch to URL import tab if available
    if (await youtenLandingPage.urlTabTrigger.isVisible()) {
      await youtenLandingPage.urlTabTrigger.click();
      await expect(youtenLandingPage.urlInput).toBeVisible();
    }
  });

  test('Guest can monitor processing pipeline and interact with recording workspace @regression @youten', async ({
    page,
    youtenProcessingPage,
    youtenDetailPage,
  }) => {
    // 1. Arrange: Mock recording processing state
    const mockRecordingId = 'rec_e2e_test_001';

    // Mock API recording detail for deterministic workspace verification
    await page.route(`**/api/recordings/${mockRecordingId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: mockRecordingId,
            title: 'Guest Meeting Recording',
            status: 'completed',
            duration: 120,
            audioUrl: 'https://example.com/audio.mp3',
            transcript: {
              segments: [
                {
                  id: 'seg-1',
                  start: 0,
                  end: 5,
                  text: 'Halo semua, selamat datang di meeting hari ini.',
                },
                {
                  id: 'seg-2',
                  start: 5,
                  end: 12,
                  text: 'Hari ini kita akan membahas roadmap Youten AI.',
                },
              ],
            },
            summary: {
              title: 'Ringkasan Rapat',
              points: ['Pembahasan roadmap', 'Review timeline'],
            },
          },
        }),
      });
    });

    // 2. Act: Navigate to processing page
    await youtenProcessingPage.open(mockRecordingId);
    await expect(youtenProcessingPage.container).toBeVisible();

    // 3. Act & Assert: Navigate to detail workspace
    await youtenDetailPage.open(mockRecordingId);
    await expect(youtenDetailPage.container).toBeVisible();
    await expect(youtenDetailPage.audioPlayer).toBeVisible();
  });
});
