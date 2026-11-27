import { test, expect } from '../../src/fixtures';

test.describe('Youten AI - Public Share Viewer Journey @regression @youten', () => {
  test('Anonymous visitor can view shared recording in read-only mode with branding @smoke @share', async ({
    page,
    youtenSharePage,
  }) => {
    // 1. Arrange: Mock shared recording data payload matching Core/BFF DTO
    const mockShareToken = 'share_test_token_888';
    const nowIso = new Date().toISOString();

    await page.route(`**/api/recordings/shared/${mockShareToken}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'rec_public_share_1',
            title: 'Publikasi Hasil Riset Youten',
            duration_seconds: 180,
            playback_url: 'https://example.com/shared_audio.mp3',
            selected_template: 'GENERAL',
            created_at: nowIso,
            segments: [
              {
                id: 's-1',
                speaker_label: 'SPEAKER_00',
                speaker_name: 'Narasumber',
                start_time: 0,
                end_time: 10,
                text: 'Terima kasih telah mendengarkan rekaman ini.',
                sequence_order: 1,
              },
            ],
            active_summary: {
              id: 'sum-share-1',
              version: 1,
              template_category: 'GENERAL',
              is_active: true,
              created_at: nowIso,
              structured_data: {
                executive_overview: 'Ringkasan eksekutif hasil riset Q4.',
                key_takeaways: ['Poin pertama publikasi'],
              },
              markdown_content: 'Ringkasan eksekutif hasil riset Q4.',
            },
            chapters: [],
            highlights: [],
          },
        }),
      });
    });

    // 2. Act: Open shared recording viewer page & switch to Transcript tab
    await youtenSharePage.open(mockShareToken);

    // 3. Assert: Check container, summary, audio player, transcript, and read-only guard
    await expect(youtenSharePage.container).toBeVisible();
    await expect(youtenSharePage.summaryViewer).toBeVisible();
    await expect(youtenSharePage.audioPlayer).toBeVisible();

    await youtenSharePage.switchToTranscriptTab();
    await expect(youtenSharePage.transcriptViewer).toBeVisible();
    await expect(page.locator('text=Terima kasih telah mendengarkan rekaman ini.')).toBeVisible();

    // Verify read-only: edit/delete controls should not exist on shared view
    const editButton = page.locator('[data-testid="edit-segment-button"], [data-testid="open-share-dialog-btn"]');
    await expect(editButton).toHaveCount(0);
  });
});
