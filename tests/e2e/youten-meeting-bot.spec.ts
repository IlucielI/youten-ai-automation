import { test, expect } from '../../src/fixtures';

// Isolate browser context for clean guest meeting bot experience
test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.YOUTEN_BASE_URL || 'http://localhost:3000',
});

test.describe('Youten AI - Meeting Voice Bot End-to-End Workflows @youten @bot', () => {
  test('User can open landing page, switch to Bot Rapat tab, and inspect conference providers @smoke', async ({
    youtenLandingPage,
    meetingBot,
  }) => {
    // 1. Arrange: Open Youten AI landing page
    await youtenLandingPage.open();

    // 2. Act: Switch to Bot Rapat (Meeting Bot) tab
    await youtenLandingPage.switchToMeetingBotTab();

    // 3. Assert: Verify Meeting Bot tab content and form visibility
    await meetingBot.expectVisible();
    await expect(meetingBot.providerSelector).toBeVisible();
    await expect(meetingBot.submitButton).toBeVisible();
  });

  test('User switches between providers and observes dynamic input schema adaptation @regression', async ({
    youtenLandingPage,
    meetingBot,
  }) => {
    // 1. Arrange: Open landing page and switch to meeting bot tab
    await youtenLandingPage.open();
    await youtenLandingPage.switchToMeetingBotTab();

    // 2. Act & Assert: Verify Google Meet is selected by default with URL input
    await expect(meetingBot.meetingUrlInput).toBeVisible();

    // 3. Act & Assert: Switch to Discord -> URL input disappears, Guild & Channel ID inputs appear
    await meetingBot.selectProvider('discord');
    await expect(meetingBot.meetingUrlInput).not.toBeVisible();
    await expect(meetingBot.discordGuildIdInput).toBeVisible();
    await expect(meetingBot.discordChannelIdInput).toBeVisible();

    // 4. Act & Assert: Switch to Zoom -> Discord inputs disappear, Meeting URL input reappears
    await meetingBot.selectProvider('zoom');
    await expect(meetingBot.discordGuildIdInput).not.toBeVisible();
    await expect(meetingBot.meetingUrlInput).toBeVisible();

    // 5. Act & Assert: Switch to Microsoft Teams -> Meeting URL input remains visible
    await meetingBot.selectProvider('teams');
    await expect(meetingBot.meetingUrlInput).toBeVisible();
  });

  test('Client validates meeting URLs and prevents invalid platform dispatches @regression', async ({
    youtenLandingPage,
    meetingBot,
  }) => {
    // 1. Arrange: Open landing page and switch to meeting bot tab
    await youtenLandingPage.open();
    await youtenLandingPage.switchToMeetingBotTab();

    // 2. Act & Assert: Submit empty meeting URL for Google Meet
    await meetingBot.selectProvider('google_meet');
    await meetingBot.submit();
    await expect(meetingBot.errorAlert).toBeVisible();
    await expect(meetingBot.errorAlert).toContainText('Tautan rapat (Meeting URL) wajib diisi');

    // 3. Act & Assert: Submit invalid URL (non-Google Meet domain)
    await meetingBot.fillMeetingUrl('https://example.com/not-a-meet');
    await meetingBot.submit();
    await expect(meetingBot.errorAlert).toBeVisible();
    await expect(meetingBot.errorAlert).toContainText(
      'Tautan harus berupa alamat resmi Google Meet',
    );

    // 4. Act & Assert: Submit invalid Zoom domain
    await meetingBot.selectProvider('zoom');
    await meetingBot.fillMeetingUrl('https://spoofed-zoom.com/j/12345');
    await meetingBot.submit();
    await expect(meetingBot.errorAlert).toBeVisible();
    await expect(meetingBot.errorAlert).toContainText(
      'Tautan harus berupa alamat resmi Zoom Meetings',
    );

    // 5. Act & Assert: Submit invalid Microsoft Teams domain
    await meetingBot.selectProvider('teams');
    await meetingBot.fillMeetingUrl('https://malicious-teams.net/meet');
    await meetingBot.submit();
    await expect(meetingBot.errorAlert).toBeVisible();
    await expect(meetingBot.errorAlert).toContainText(
      'Tautan harus berupa alamat resmi Microsoft Teams',
    );

    // 6. Act & Assert: Submit Discord without Guild ID or Channel ID
    await meetingBot.selectProvider('discord');
    await meetingBot.submit();
    await expect(meetingBot.errorAlert).toBeVisible();
    await expect(meetingBot.errorAlert).toContainText('Server ID / Guild ID Discord wajib diisi');
  });

  test('User dispatches Google Meet bot, tracks live session state, and completes recording @smoke @regression', async ({
    page,
    youtenLandingPage,
    meetingBot,
  }) => {
    const mockSessionId = 'bot_session_meet_001';
    const mockRecordingId = 'rec_meet_result_001';

    // 1. Arrange: Intercept BFF API routes for deterministic live bot lifecycle
    await page.route('**/api/capabilities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            google_meet: 'available',
            zoom: 'available',
            teams: 'available',
            discord: 'available',
          },
        }),
      });
    });

    await page.route('**/api/recordings/meeting-bot', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            session_id: mockSessionId,
            provider: 'google_meet',
            status: 'WAITING_ADMIT',
            meeting_url: 'https://meet.google.com/abc-defg-hij',
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route(`**/api/recordings/meeting-bot/${mockSessionId}/status`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            session_id: mockSessionId,
            provider: 'google_meet',
            status: 'RECORDING',
            meeting_url: 'https://meet.google.com/abc-defg-hij',
            recording_id: mockRecordingId,
            duration_seconds: 45,
          },
        }),
      });
    });

    await page.route(`**/api/recordings/meeting-bot/${mockSessionId}/stop`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            session_id: mockSessionId,
            status: 'COMPLETED',
            recording_id: mockRecordingId,
          },
        }),
      });
    });

    // 2. Act: Navigate to landing page and switch to Bot Rapat tab
    await youtenLandingPage.open();
    await youtenLandingPage.switchToMeetingBotTab();

    // 3. Act: Select Google Meet and enter valid meeting details
    await meetingBot.selectProvider('google_meet');
    await meetingBot.fillMeetingUrl('https://meet.google.com/abc-defg-hij');
    await meetingBot.fillMetadata({
      title: 'Sprint Planning Meeting',
      template: 'MOM',
      language: 'id',
    });

    // 4. Act: Dispatch the bot
    await meetingBot.submit();

    // 5. Assert: Live Tracker appears with active session
    await meetingBot.expectTrackerVisible();
    await meetingBot.expectStatus('Menghubungkan');

    // 6. Act: Stop the meeting bot session
    await meetingBot.stopBot();

    // 7. Assert: Session transitions to completed with View Notula action
    await meetingBot.expectCompleted();
    await expect(meetingBot.viewNotulaButton).toHaveAttribute(
      'href',
      `/recordings/${mockRecordingId}`,
    );
  });
});
