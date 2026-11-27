import { test, expect } from '../../src/fixtures';

test.describe('Youten AI - Guest Ingestion & Workspace Journey @smoke @youten', () => {
  test('Guest can inspect landing page, switch to URL input, and navigate workspace @guest @smoke', async ({
    youtenLandingPage,
  }) => {
    // 1. Arrange: Open Landing Page
    await youtenLandingPage.open();

    // 2. Assert: Verify hero components and upload triggers
    await expect(youtenLandingPage.heroHeading).toBeVisible();
    await expect(youtenLandingPage.fileInput).toBeAttached();

    // 3. Act: Switch to URL import tab
    await expect(youtenLandingPage.urlTabTrigger).toBeVisible();
    await youtenLandingPage.urlTabTrigger.click();
    await expect(youtenLandingPage.urlInput).toBeVisible();
  });

  test('Guest can monitor processing pipeline and interact with recording workspace @regression @youten', async ({
    page,
    youtenProcessingPage,
    youtenDetailPage,
  }) => {
    // 1. Arrange: Mock recording detail, versions, and progress API
    const mockRecordingId = 'rec_e2e_test_001';
    const nowIso = new Date().toISOString();

    await page.route(`**/api/recordings/${mockRecordingId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: mockRecordingId,
            title: 'Guest Meeting Recording',
            original_filename: 'guest-meeting.mp3',
            duration_seconds: 120,
            playback_url: 'https://example.com/audio.mp3',
            status: 'COMPLETED',
            selected_template: 'GENERAL',
            is_guest: true,
            created_at: nowIso,
            segments: [
              {
                id: 'seg-1',
                speaker_label: 'SPEAKER_00',
                speaker_name: 'Host',
                start_time: 0,
                end_time: 5,
                text: 'Halo semua, selamat datang di meeting hari ini.',
                sequence_order: 1,
              },
              {
                id: 'seg-2',
                speaker_label: 'SPEAKER_01',
                speaker_name: 'Tamu',
                start_time: 5,
                end_time: 12,
                text: 'Hari ini kita akan membahas roadmap Youten AI.',
                sequence_order: 2,
              },
            ],
            active_summary: {
              id: 'sum-1',
              version: 1,
              template_category: 'GENERAL',
              is_active: true,
              created_at: nowIso,
              structured_data: {
                executive_overview: 'Pembahasan roadmap Q4 dan review timeline rilis.',
                discussion_topics: [
                  {
                    topic: 'Roadmap Youten AI',
                    key_points: ['Fokus stabilitas transkrip', 'Peningkatan Ask AI'],
                  },
                ],
                open_points: ['Validasi timeline QA'],
                key_takeaways: ['Pembahasan roadmap berjalan lancar'],
              },
              markdown_content: 'Pembahasan roadmap Q4.',
            },
            chapters: [],
            highlights: [],
          },
        }),
      });
    });

    await page.route(`**/api/recordings/${mockRecordingId}/summaries`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    // 2. Act & Assert: Navigate to processing page
    await youtenProcessingPage.open(mockRecordingId);
    await expect(youtenProcessingPage.stepper).toBeVisible();

    // 3. Act & Assert: Navigate to detail workspace and verify structured summary + transcript
    await youtenDetailPage.open(mockRecordingId);
    await expect(youtenDetailPage.container).toBeVisible();
    await expect(youtenDetailPage.audioPlayer).toBeVisible();
    await expect(youtenDetailPage.generalRenderer).toBeVisible();

    await youtenDetailPage.switchToTranscriptTab();
    await expect(page.locator('text=Halo semua, selamat datang di meeting hari ini.')).toBeVisible();
  });
});
