import { test, expect } from '../../src/fixtures';

test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.YOUTEN_BASE_URL || 'https://youten.bayuanugerah.my.id',
});

test.describe('Youten AI - Multi-Meeting Ask AI (Folder & Workspace Intelligence) @smoke @regression @chat @workspace', () => {
  const mockWorkspaceId = 'ws_chat_e2e_001';
  const mockFolderId = 'fld_chat_e2e_001';

  const mockSessions = [
    {
      id: 'sess_e2e_001',
      workspace_id: mockWorkspaceId,
      folder_id: null,
      folder_name: null,
      title: 'Sprint Planning Summary & Blockers',
      message_count: 2,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const mockSessionHistory = {
    session: mockSessions[0],
    messages: [
      {
        id: 'msg_001',
        session_id: 'sess_e2e_001',
        role: 'user',
        content: 'Apa saja blocker utama di sprint ini?',
        citations: [],
        created_at: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: 'msg_002',
        session_id: 'sess_e2e_001',
        role: 'assistant',
        content: 'Blocker utama adalah integrasi payment gateway yang masih menunggu verifikasi sandbox.',
        citations: [
          {
            recording_id: 'rec_001',
            recording_title: 'Sprint Retrospective & Sync #42',
            folder_id: mockFolderId,
            folder_name: 'Engineering',
            start_time: 135.5,
            end_time: 152.0,
            snippet: 'Kita masih tertahan di verifikasi sandbox payment gateway dari vendor pihak ketiga.',
          },
        ],
        created_at: new Date(Date.now() - 3400000).toISOString(),
      },
    ],
  };

  test.beforeEach(async ({ page }) => {
    const rawBaseUrl = process.env.YOUTEN_BASE_URL || 'https://youten.bayuanugerah.my.id';
    const urlObj = new URL(rawBaseUrl);

    // Pre-seed authentication and active workspace cookies
    await page.context().addCookies([
      {
        name: 'youten_access_token',
        value: 'mock_jwt_access_token_chat_e2e',
        domain: urlObj.hostname,
        path: '/',
      },
      {
        name: 'youten_active_workspace_id',
        value: mockWorkspaceId,
        domain: urlObj.hostname,
        path: '/',
      },
    ]);

    // Mock auth profile
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'usr_chat_e2e_001',
            email: 'chat-tester@example.com',
            full_name: 'Chat Tester',
            status: 'ACTIVE',
            email_verified: true,
          },
        }),
      });
    });

    // Mock refresh
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: { token: 'mock_refreshed_token' },
        }),
      });
    });

    // Mock templates
    await page.route('**/api/templates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    // Mock workspaces list
    await page.route('**/api/workspaces', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: [
            {
              id: mockWorkspaceId,
              name: 'Intelligence Workspace',
              slug: 'intelligence-workspace',
              role: 'owner',
            },
          ],
        }),
      });
    });

    // Mock active workspace detail
    await page.route('**/api/workspaces/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: mockWorkspaceId,
            name: 'Intelligence Workspace',
            slug: 'intelligence-workspace',
            role: 'owner',
          },
        }),
      });
    });

    // Mock workspace members
    await page.route('**/api/workspaces/*/members*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: [
            {
              id: 'mbr_001',
              workspace_id: mockWorkspaceId,
              user_id: 'usr_chat_e2e_001',
              role: 'owner',
              full_name: 'Chat Tester',
              email: 'chat-tester@example.com',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // Mock workspace invites
    await page.route('**/api/workspaces/*/invites*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: [] }),
      });
    });

    // Mock folders
    await page.route('**/api/folders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: [
            {
              id: mockFolderId,
              workspace_id: mockWorkspaceId,
              name: 'Engineering',
              color: '#3B82F6',
              recording_count: 5,
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // Mock recordings list
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
                id: 'rec_001',
                workspace_id: mockWorkspaceId,
                folder_id: mockFolderId,
                title: 'Sprint Retrospective & Sync #42',
                status: 'COMPLETED',
                duration: 1800,
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

    // Mock chat sessions list and creation
    await page.route(/\/api\/chat\/sessions(\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() || {};
        const newSession = {
          id: 'sess_created_' + Date.now(),
          workspace_id: mockWorkspaceId,
          folder_id: body.folder_id || null,
          folder_name: body.folder_id ? 'Engineering' : null,
          title: body.title || 'New Conversation',
          message_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            code: 'SUCCESS',
            data: newSession,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            code: 'SUCCESS',
            data: mockSessions,
          }),
        });
      }
    });

    // Mock chat session detail history
    await page.route(/\/api\/chat\/sessions\/[^/?]+(\?.*)?$/, async (route) => {
      const url = route.request().url();
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: { success: true } }),
        });
      } else if (url.includes('sess_e2e_001')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            code: 'SUCCESS',
            data: mockSessionHistory.messages,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            code: 'SUCCESS',
            data: [],
          }),
        });
      }
    });

    // Mock chat SSE streaming endpoint
    await page.route(/\/api\/chat\/stream(\?.*)?$/, async (route) => {
      const sseBody = [
        'event: meta\ndata: {"session_id":"sess_e2e_001","scope":"workspace"}\n\n',
        'event: token\ndata: {"token":"Berdasarkan rekap rekaman lintas rapat, "}\n\n',
        'event: token\ndata: {"token":"tim telah menyepakati jadwal rilis production pada hari Jumat pukul 10:00."}\n\n',
        'event: citations\ndata: [{"recording_id":"rec_001","recording_title":"Sprint Retrospective & Sync #42","folder_id":"' +
          mockFolderId +
          '","folder_name":"Engineering","start_time":135.5,"end_time":152.0,"snippet":"Kita jadwalkan rilis production di hari Jumat jam 10 pagi."}]\n\n',
        'event: done\ndata: {}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
        body: sseBody,
      });
    });
  });

  test('should open Workspace Ask AI drawer from dashboard header and display starter chips', async ({
    youtenDashboardPage,
    workspaceChatDrawer,
  }) => {
    // Arrange & Act
    await youtenDashboardPage.open();
    await youtenDashboardPage.openWorkspaceAi();

    // Assert
    await workspaceChatDrawer.expectOpen();
    const title = await workspaceChatDrawer.getTitleText();
    expect(title).toContain('Ask Workspace AI');
    await workspaceChatDrawer.startNewSession();
    await expect(workspaceChatDrawer.starterChipsContainer).toBeVisible();
    await expect(workspaceChatDrawer.starterChips.first()).toBeVisible();
  });

  test('should submit question and render streaming answer with meeting citations', async ({
    youtenDashboardPage,
    workspaceChatDrawer,
  }) => {
    // Arrange
    await youtenDashboardPage.open();
    await youtenDashboardPage.openWorkspaceAi();
    await workspaceChatDrawer.expectOpen();

    // Act: Send query
    await workspaceChatDrawer.sendQuestion('Kapan jadwal rilis production?');

    // Assert: User message appears in history
    await expect(workspaceChatDrawer.userMessages.last()).toContainText('Kapan jadwal rilis production?');

    // Assert: Assistant streams response
    await workspaceChatDrawer.expectAssistantResponse('jadwal rilis production pada hari Jumat pukul 10:00');

    // Assert: Meeting citations card renders
    await workspaceChatDrawer.expectCitationsVisible(1);
    const citation = workspaceChatDrawer.citationCards.first();
    await expect(citation).toContainText('Sprint Retrospective & Sync #42');
    await expect(citation).toContainText('Engineering');
  });

  test('should open folder-scoped Ask AI and adapt title', async ({
    youtenDashboardPage,
    workspaceChatDrawer,
  }) => {
    // Arrange
    await youtenDashboardPage.open();

    // Act: Open Ask AI via folder button
    await youtenDashboardPage.openFolderAi(mockFolderId);

    // Assert: Drawer opens with Folder AI title
    await workspaceChatDrawer.expectOpen();
    const title = await workspaceChatDrawer.getTitleText();
    expect(title).toContain('Ask Folder AI');
    expect(title).toContain('Engineering');
  });

  test('should allow starting a new chat session and closing the drawer', async ({
    youtenDashboardPage,
    workspaceChatDrawer,
  }) => {
    // Arrange
    await youtenDashboardPage.open();
    await youtenDashboardPage.openWorkspaceAi();
    await workspaceChatDrawer.expectOpen();

    // Act: Start new session
    await workspaceChatDrawer.startNewSession();

    // Assert: Empty starter chips are visible for the new session
    await expect(workspaceChatDrawer.starterChipsContainer).toBeVisible();

    // Act: Close drawer
    await workspaceChatDrawer.close();
    await workspaceChatDrawer.expectClosed();
  });
});

