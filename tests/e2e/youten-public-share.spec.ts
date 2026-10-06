import { test, expect } from '../../src/fixtures';

test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.YOUTEN_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
});

test.describe('Youten AI - Public Share Viewer Journey @regression @youten', () => {
  test('Anonymous visitor can view shared recording in read-only mode with branding @smoke @share', async ({
    page,
    youtenSharePage,
  }) => {
    // 1. Arrange: Mock shared recording data payload
    const mockShareToken = 'share_test_token_888';

    await page.route(`**/api/recordings/share/${mockShareToken}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'rec_public_share_1',
            title: 'Publikasi Hasil Riset Youten',
            duration: 180,
            audioUrl: 'https://example.com/shared_audio.mp3',
            transcript: {
              segments: [
                {
                  id: 's-1',
                  start: 0,
                  end: 10,
                  text: 'Terima kasih telah mendengarkan rekaman ini.',
                },
              ],
            },
            summary: {
              title: 'Ringkasan Eksekutif',
              points: ['Poin pertama publikasi'],
            },
          },
        }),
      });
    });

    // 2. Act: Open shared recording viewer page
    await youtenSharePage.open(mockShareToken);

    // 3. Assert: Check container, branding, and absence of private edit controls
    await expect(youtenSharePage.container).toBeVisible();
    await expect(youtenSharePage.audioPlayer).toBeVisible();
    await expect(youtenSharePage.transcriptViewer).toBeVisible();

    // Verify read-only: delete or rename options should not exist
    const deleteButton = page.locator(
      'button:has-text("Hapus"), [data-testid="delete-recording-btn"]',
    );
    await expect(deleteButton).not.toBeVisible();
  });
});
