import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenInvitationPage extends BasePage {
  readonly acceptButton: Locator;

  constructor(page: Page) {
    super(page);
    this.acceptButton = this.page.locator('[data-testid="btn-accept-invitation"]');
  }

  async open(token: string): Promise<void> {
    Logger.step(`Navigating to public invitation page with token: ${token}`);
    await this.goto(`/invitations/${token}`);
  }

  async accept(): Promise<void> {
    Logger.step('Accepting workspace invitation');
    await this.click(this.acceptButton);
  }
}

