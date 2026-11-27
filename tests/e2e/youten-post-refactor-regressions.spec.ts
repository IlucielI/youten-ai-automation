import { test, expect } from '../../src/fixtures';

test.describe('Youten AI - Post-Refactor Comprehensive E2E Regressions @regression @youten', () => {
  test('Ask AI transparently refreshes expired 401 session and streams answer without false empty error @smoke @chat', async ({
    page,
    youtenDetailPage,
  }) => {
    // 1. Arrange: Mock recording detail + chat endpoint returning 401 on first attempt, 200 SSE after refresh
    const recordingId = 'rec_e2e_chat_refresh_001';
    const nowIso = new Date().toISOString();
    let chatAttempts = 0;
    let refreshCalled = 0;

    await page.route(`**/api/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: { id: 'usr_1', email: 'user@example.com', full_name: 'Bayu', status: 'ACTIVE', role_name: 'Pro' },
        }),
      });
    });

    await page.route('**/api/auth/refresh', async (route) => {
      refreshCalled += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: { access_token: 'fresh_jwt' } }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: recordingId,
            title: 'Alignin TICS NBS x INSIGNIA',
            original_filename: 'alignin.mp3',
            duration_seconds: 600,
            status: 'COMPLETED',
            selected_template: 'MOM',
            is_guest: false,
            created_at: nowIso,
            segments: [
              {
                id: 'seg-1',
                speaker_label: 'SPEAKER_00',
                speaker_name: 'Ki',
                start_time: 10,
                end_time: 20,
                text: 'HLD LLD dibahas di fase arsitektur.',
                sequence_order: 1,
              },
            ],
            active_summary: {
              id: 'sum-mom-1',
              version: 1,
              template_category: 'MOM',
              is_active: true,
              created_at: nowIso,
              structured_data: {},
              markdown_content: JSON.stringify({
                meeting_title: 'Penyelarasan Arsitektur Data Pipeline',
                executive_summary: 'Finalisasi arsitektur Silver-Gold Layer.',
                meeting_dynamics: {
                  speaker_talk_time: [{ speaker: 'Ki', percentage: 43, duration_minutes: 25 }],
                  consensus_score: '85%',
                  sentiment_trajectory: 'Kolaboratif',
                },
                stakeholder_perspectives: {
                  executive_brief: 'Governance terjaga',
                  engineering_focus: 'ClickHouse + S3 Parquet',
                  product_delivery: 'Migrasi tracker',
                },
                key_decisions: [],
                action_items: [],
                open_issues: [],
              }).replace('"Kolaboratif"}', '"Kolaboratif"]'),
            },
            chapters: [],
            highlights: [],
          },
        }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}/summaries`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}/chat*`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
        });
        return;
      }

      chatAttempts += 1;
      if (chatAttempts === 1) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'fail', code: 'UNAUTHORIZED', message: 'Session access token expired' }),
        });
        return;
      }

      const sseBody = [
        'event: session\ndata: {"session_id":"sess_refreshed_1"}\n\n',
        'event: token\ndata: {"token":"HLD LLD disebutkan oleh Ki pada menit ke-00:10."}\n\n',
        'event: done\ndata: {"session_id":"sess_refreshed_1","citations":["[00:10] HLD LLD"]}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sseBody,
      });
    });

    // 2. Act & Assert: MOM malformed JSON renders structured MomRenderer (not raw JSON)
    await youtenDetailPage.open(recordingId);
    await expect(youtenDetailPage.momRenderer).toBeVisible();
    await expect(page.locator('text=Penyelarasan Arsitektur Data Pipeline')).toBeVisible();
    await expect(page.locator('text="meeting_title"')).toHaveCount(0);

    // 3. Act & Assert: Ask AI recovers from 401 via silent refresh and streams response
    await youtenDetailPage.sendChatMessage('HLD LLD di mention oleh siapa ya');
    await expect(page.locator('text=HLD LLD disebutkan oleh Ki pada menit ke-00:10.')).toBeVisible();
    await expect(youtenDetailPage.chatEmptyResponseError).toHaveCount(0);
    await expect(youtenDetailPage.chatErrorBanner).toHaveCount(0);
    expect(refreshCalled).toBe(1);
    expect(chatAttempts).toBe(2);
  });

  test('Ask AI HTTP 403 displays error banner with Retry and does not emit bogus empty response bubble @chat', async ({
    page,
    youtenDetailPage,
  }) => {
    const recordingId = 'rec_e2e_chat_err_002';
    const nowIso = new Date().toISOString();

    await page.route(`**/api/recordings/${recordingId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: recordingId,
            title: 'Error Contrast Test',
            original_filename: 'err.mp3',
            duration_seconds: 60,
            status: 'COMPLETED',
            selected_template: 'GENERAL',
            is_guest: true,
            created_at: nowIso,
            segments: [],
            active_summary: {
              id: 'sum-gen-1',
              version: 1,
              template_category: 'GENERAL',
              is_active: true,
              created_at: nowIso,
              structured_data: {
                executive_overview: 'Ringkasan enriched tanpa core_themes dan notable_quotes.',
                discussion_topics: [{ topic: 'Topik Enriched', key_points: ['Poin X'] }],
                open_points: ['Isu terbuka 1'],
                action_items: [{ task: 'Follow up', pic: 'Bayu', due_date: 'Besok', priority: 'P1' }],
                key_takeaways: ['Takeaway 1'],
              },
              markdown_content: '',
            },
            chapters: [],
            highlights: [],
          },
        }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}/summaries`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}/chat*`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
        });
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'fail', code: 'FORBIDDEN', message: 'forbidden access' }),
      });
    });

    // Assert enriched GENERAL renders cleanly even without core_themes/notable_quotes
    await youtenDetailPage.open(recordingId);
    await expect(youtenDetailPage.generalRenderer).toBeVisible();
    await expect(page.locator('text=Topik Enriched')).toBeVisible();
    await expect(page.locator('text=Isu terbuka 1')).toBeVisible();

    // Send chat expecting real 403 banner without empty assistant response bubble
    await youtenDetailPage.sendChatMessage('Test forbidden handling');
    await expect(youtenDetailPage.chatErrorBanner).toBeVisible();
    await expect(youtenDetailPage.chatErrorBanner).toContainText('forbidden access');
    await expect(youtenDetailPage.chatErrorRetryButton).toBeVisible();
    await expect(youtenDetailPage.chatEmptyResponseError).toHaveCount(0);
  });

  test('Recording detail supports 401 refresh on segment edit and avoids duplicate fetch on language toggle @regression', async ({
    page,
    youtenDetailPage,
  }) => {
    const recordingId = 'rec_e2e_detail_ops_003';
    const nowIso = new Date().toISOString();
    let getDetailCount = 0;
    let patchAttempts = 0;

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: { access_token: 'fresh_seg_jwt' } }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}`, async (route) => {
      getDetailCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: recordingId,
            title: 'Segment Edit & Tech Review Test',
            original_filename: 'tech.mp3',
            duration_seconds: 120,
            status: 'COMPLETED',
            selected_template: 'TECH_REVIEW',
            is_guest: true,
            created_at: nowIso,
            segments: [
              {
                id: 'seg-edit-1',
                speaker_label: 'SPEAKER_00',
                speaker_name: 'Lead',
                start_time: 0,
                end_time: 8,
                text: 'Teks segmen awal.',
                sequence_order: 1,
              },
            ],
            active_summary: {
              id: 'sum-tech-1',
              version: 1,
              template_category: 'TECH_REVIEW',
              custom_angle: 'Fokus latensi dan caching',
              is_active: true,
              created_at: nowIso,
              structured_data: {
                context: 'Evaluasi Redis cache.',
                discussion_topics: [{ topic: 'Eviction Policy', key_points: ['allkeys-lru'] }],
                decisions_adopted: [{ decision: 'Pakai Redis 7', technical_justification: 'Stabil' }],
                rejected_alternatives: [{ alternative: 'In-memory map', rejection_reason: 'Tidak terdistribusi' }],
                nfr_assessment: {
                  security: 'TLS aktif',
                  performance_scalability: '< 2ms p99',
                  reliability_resilience: 'Sentinel HA',
                },
                technical_debt_impact: null,
                open_points: ['Load test 10k RPS'],
                action_items: [{ task: 'Setup alert', assignee: 'Andi', target_sprint: 'Sprint 14' }],
              },
              markdown_content: '',
            },
            chapters: [],
            highlights: [],
          },
        }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}/summaries`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    await page.route(`**/api/recordings/${recordingId}/segments/seg-edit-1`, async (route) => {
      patchAttempts += 1;
      if (patchAttempts === 1) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'fail', code: 'UNAUTHORIZED', message: 'Session access token expired' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: { id: 'seg-edit-1' } }),
      });
    });

    await youtenDetailPage.open(recordingId);
    await expect(youtenDetailPage.techReviewRenderer).toBeVisible();
    await expect(page.locator('text=Eviction Policy')).toBeVisible();
    await expect(page.locator('text=Fokus latensi dan caching')).toBeVisible();
    const initialFetches = getDetailCount;

    // Switch language and verify no extra GET /api/recordings/:id fires
    await youtenDetailPage.switchLanguage('en');
    await youtenDetailPage.switchToTranscriptTab();
    expect(getDetailCount).toBe(initialFetches);

    // Inline segment edit triggers 401 refresh + succeeds cleanly
    await youtenDetailPage.editSegmentText('seg-edit-1', 'Teks segmen diperbarui.');
    await expect(page.locator('text=Teks segmen diperbarui.')).toBeVisible();
    expect(patchAttempts).toBe(2);
  });

  test('Magic link verification runs once despite language switch & invitation 401 redirects to login @auth', async ({
    page,
    youtenAuthPage,
    youtenInvitationPage,
  }) => {
    let verifyRequests = 0;

    await page.route('**/api/auth/verify-email', async (route) => {
      verifyRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            access_token: 'tok_verified',
            user: { id: 'usr_v1', email: 'verified@example.com', full_name: 'Verified User', email_verified: true },
          },
        }),
      });
    });

    await youtenAuthPage.openVerifyMagicLink('magic_one_time_token_999');
    await expect(youtenAuthPage.verifySuccessCard).toBeVisible();

    // Toggling language must not re-submit the already-consumed magic token
    await youtenAuthPage.langEnButton.click();
    await expect(youtenAuthPage.verifySuccessCard).toBeVisible();
    expect(verifyRequests).toBe(1);

    // Unauthenticated workspace invitation accept receiving 401 redirects to login
    const invToken = 'inv_e2e_unauth_123';
    await page.route(`**/api/workspaces/invitations/${invToken}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'inv_1',
            workspace_id: 'ws_1',
            workspace_name: 'Core Engineering',
            email: 'invitee@example.com',
            role: 'member',
            token: invToken,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route(`**/api/workspaces/invitations/${invToken}/accept`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'fail', code: 'UNAUTHORIZED', message: 'Session access token expired' }),
      });
    });

    await youtenInvitationPage.open(invToken);
    await youtenInvitationPage.accept();
    await expect(page).toHaveURL(/\/login\?redirect=\/invitations\/inv_e2e_unauth_123/);
  });

  test('Dashboard & Settings templates work cleanly after refactor without refetching on locale switch @smoke', async ({
    page,
    youtenDashboardPage,
    youtenSettingsPage,
  }) => {
    let recordingsFetchCount = 0;
    const nowIso = new Date().toISOString();

    await page.route('**/api/auth/me', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as { full_name?: string };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            code: 'SUCCESS',
            data: { id: 'usr_dash_1', email: 'bayu@example.com', full_name: body.full_name || 'Bayu Updated' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'usr_dash_1',
            email: 'bayu@example.com',
            full_name: 'Bayu Tester',
            status: 'ACTIVE',
            email_verified: true,
            daily_quota: 5,
            quota_used_today: 1,
            quota_remaining: 4,
          },
        }),
      });
    });

    await page.route('**/api/workspaces*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });

    await page.route('**/api/folders*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });

    await page.route('**/api/templates*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });

    await page.route('**/api/recordings*', async (route) => {
      recordingsFetchCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            items: [
              {
                id: 'rec_dash_1',
                title: 'Weekly Sync Architecture',
                original_filename: 'weekly.mp3',
                duration_seconds: 320,
                status: 'COMPLETED',
                selected_template: 'MOM',
                created_at: nowIso,
              },
            ],
            pagination: { current_page: 1, page_size: 12, total_items: 1, total_pages: 1 },
          },
        }),
      });
    });

    await youtenDashboardPage.open();
    await expect(page.locator('text=Weekly Sync Architecture').first()).toBeVisible();
    const initialCount = recordingsFetchCount;

    // Toggle language on dashboard without redundant /api/recordings call
    await page.locator('[data-testid="lang-btn-en"]').first().click();
    await page.locator('[data-testid="list-view-btn"]').click();
    await expect(page.locator('table')).toBeVisible();
    expect(recordingsFetchCount).toBe(initialCount);

    // Navigate to settings and update profile name
    await youtenSettingsPage.open();
    await expect(youtenSettingsPage.quotaCard).toBeVisible();
    await youtenSettingsPage.updateProfileName('Bayu Anugerah');
    await expect(youtenSettingsPage.fullNameInput).toHaveValue('Bayu Anugerah');
  });
});

