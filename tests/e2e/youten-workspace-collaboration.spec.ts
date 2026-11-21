import { test, expect } from '../../src/fixtures';

test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.YOUTEN_BASE_URL || process.env.BASE_URL || 'https://youten.bayuanugerah.my.id',
});

test.describe('Youten AI - Workspace Collaboration & Folder Navigation @smoke @regression @workspace', () => {
  const mockWorkspaceId = 'ws_collab_e2e_001';
  const mockFolderId = 'fld_collab_e2e_001';

  let members = [
    {
      id: 'mbr_001',
      workspace_id: mockWorkspaceId,
      user_id: 'usr_owner_001',
      role: 'owner',
      full_name: 'Workspace Owner',
      email: 'workspace-owner@example.com',
      created_at: new Date().toISOString(),
    },
  ];

  let invites = [
    {
      id: 'inv_001',
      workspace_id: mockWorkspaceId,
      email: 'pending-member@example.com',
      role: 'member',
      token: 'token_inv_001',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  let folders = [
    {
      id: mockFolderId,
      workspace_id: mockWorkspaceId,
      name: 'Sprint Planning',
      created_at: new Date().toISOString(),
    },
  ];

  test.beforeEach(async ({ page }) => {
    const rawBaseUrl = process.env.YOUTEN_BASE_URL || process.env.BASE_URL || 'https://youten.bayuanugerah.my.id';
    const urlObj = new URL(rawBaseUrl);

    // Pre-seed authentication and active workspace cookies
    await page.context().addCookies([
      {
        name: 'youten_access_token',
        value: 'mock_jwt_access_token_123',
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

    // Mock authentication profile endpoint
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'usr_owner_001',
            email: 'workspace-owner@example.com',
            full_name: 'Workspace Owner',
            status: 'ACTIVE',
            email_verified: true,
          },
        }),
      });
    });

    // Mock token refresh
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

    // Mock templates endpoint
    await page.route('**/api/templates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: [],
        }),
      });
    });

    // Mock workspaces list
    await page.route('**/api/workspaces', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            code: 'SUCCESS',
            data: [
              {
                id: mockWorkspaceId,
                name: 'Acme Product Team',
                slug: 'acme-product-team',
                owner_id: 'usr_owner_001',
                created_at: new Date().toISOString(),
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock active workspace setting
    await page.route('**/api/workspaces/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: { workspace_id: mockWorkspaceId } }),
      });
    });

    // Mock workspace members
    await page.route(`**/api/workspaces/*/members*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: members,
        }),
      });
    });

    // Mock workspace invites
    await page.route(`**/api/workspaces/*/invites*`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: invites }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newInvite = {
          id: `inv_${Date.now()}`,
          workspace_id: mockWorkspaceId,
          email: body.email,
          role: body.role || 'member',
          token: `token_${Date.now()}`,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date().toISOString(),
        };
        invites = [...invites, newInvite];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: newInvite }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock folders API
    await page.route('**/api/folders*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: folders }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newFolder = {
          id: `fld_${Date.now()}`,
          workspace_id: mockWorkspaceId,
          name: body.name || 'New Folder',
          created_at: new Date().toISOString(),
        };
        folders = [...folders, newFolder];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', code: 'SUCCESS', data: newFolder }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock dashboard recordings API
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
                id: 'rec_collab_001',
                title: 'Sprint Kickoff Q1',
                duration: 180,
                status: 'completed',
                folder_id: mockFolderId,
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
  });

  test('User can see workspace in switcher and browse folder sidebar tree @smoke @workspace', async ({
    page,
    youtenDashboardPage,
  }) => {
    // 1. Act: Navigate to Dashboard
    await youtenDashboardPage.open();

    // 2. Assert: Verify Workspace Switcher and Folder Sidebar
    await expect(youtenDashboardPage.folderSidebar).toBeVisible();
    await expect(page.locator('button:has-text("All Recordings"), button:has-text("Semua Rekaman")').first()).toBeVisible();

    // Verify existing folder is listed
    await expect(page.locator('text=Sprint Planning').first()).toBeVisible();

    // 3. Act: Create a new folder
    await youtenDashboardPage.createFolder('Design Review');

    // 4. Assert: Dialog closes and new folder item is appended
    await expect(page.locator('text=Design Review').first()).toBeVisible();
  });

  test('User can manage team members and issue invitations in Workspace Settings @regression @workspace', async ({
    page,
    youtenWorkspacePage,
  }) => {
    // 1. Act: Open Workspace settings tab
    await youtenWorkspacePage.open();

    // 2. Assert: Verify members and existing invitations tables
    await expect(youtenWorkspacePage.membersCard).toBeVisible();
    await expect(page.locator('text=workspace-owner@example.com').first()).toBeVisible();
    await expect(page.locator('text=pending-member@example.com').first()).toBeVisible();

    // 3. Act: Send new invitation
    await youtenWorkspacePage.inviteMember('colleague@example.com');

    // 4. Assert: New invite appears in pending list
    await expect(page.locator('text=colleague@example.com').first()).toBeVisible();
  });

  test('Public invitation link allows teammate to accept and join workspace @smoke @workspace', async ({
    page,
    youtenInvitationPage,
  }) => {
    const inviteToken = 'token_e2e_public_join';

    // Mock public invitation endpoint
    await page.route(`**/api/workspaces/invitations/${inviteToken}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'inv_join_001',
            workspace_id: mockWorkspaceId,
            workspace_name: 'Acme Product Team',
            email: 'new-teammate@example.com',
            role: 'member',
            token: inviteToken,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    // Mock accept invitation endpoint
    await page.route(`**/api/workspaces/invitations/${inviteToken}/accept`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 'SUCCESS',
          data: {
            id: 'mbr_joined_001',
            workspace_id: mockWorkspaceId,
            user_id: 'usr_new_001',
            role: 'member',
          },
        }),
      });
    });

    // 1. Act: Navigate to public invitation page
    await youtenInvitationPage.open(inviteToken);

    // 2. Assert: Workspace card is rendered with details
    await expect(page.locator('text=Acme Product Team')).toBeVisible();
    await expect(page.locator('text=new-teammate@example.com')).toBeVisible();
    await expect(youtenInvitationPage.acceptButton).toBeVisible();

    // 3. Act: Accept invitation
    await youtenInvitationPage.accept();

    // 4. Assert: Confirmation status and redirection to dashboard
    await expect(page.locator('text=You are a member of this workspace!')).toBeVisible();
  });
});
