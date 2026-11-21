import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenWorkspacePage extends BasePage {
  readonly urlPath = '/settings?tab=workspaces';

  readonly container: Locator;
  readonly workspaceTab: Locator;
  readonly inviteMemberButton: Locator;
  readonly inviteEmailInput: Locator;
  readonly submitInviteButton: Locator;
  readonly membersCard: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="settings-page"]');
    this.workspaceTab = this.page.locator('[data-testid="tab-workspaces"]').first();
    this.inviteMemberButton = this.page.locator('[data-testid="invite-member-btn"]').first();
    this.inviteEmailInput = this.page.locator('[data-testid="invite-email-input"]').first();
    this.submitInviteButton = this.page.locator('[data-testid="submit-invite-btn"]').first();
    this.membersCard = this.page.locator('[data-testid="members-card"]').first();
  }

  async open(): Promise<void> {
    Logger.step('Navigating to workspace settings tab');
    await this.goto(this.urlPath);
    await this.expectVisible(this.container);
    if (await this.workspaceTab.isVisible()) {
      await this.click(this.workspaceTab);
    }
  }

  async inviteMember(email: string): Promise<void> {
    Logger.step(`Inviting workspace member: ${email}`);
    await this.click(this.inviteMemberButton);
    await this.expectVisible(this.inviteEmailInput);
    await this.fill(this.inviteEmailInput, email);
    await this.click(this.submitInviteButton);
  }
}
