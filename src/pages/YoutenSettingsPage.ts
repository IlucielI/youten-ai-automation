import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenSettingsPage extends BasePage {
  readonly container: Locator;
  readonly profileTab: Locator;
  readonly securityTab: Locator;
  readonly workspacesTab: Locator;
  readonly fullNameInput: Locator;
  readonly saveProfileButton: Locator;
  readonly quotaCard: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="settings-page"]');
    this.profileTab = this.page.locator('[data-testid="tab-profile"]');
    this.securityTab = this.page.locator('[data-testid="tab-security"]');
    this.workspacesTab = this.page.locator('[data-testid="tab-workspaces"]');
    this.fullNameInput = this.page.locator('[data-testid="input-full-name"]');
    this.saveProfileButton = this.page.locator('[data-testid="button-save-profile"]');
    this.quotaCard = this.page.locator('[data-testid="quota-card"]');
  }

  async open(): Promise<void> {
    Logger.step('Navigating to settings page');
    await this.goto('/settings');
    await this.expectVisible(this.container);
  }

  async updateProfileName(newName: string): Promise<void> {
    Logger.step(`Updating profile name to: ${newName}`);
    await this.fill(this.fullNameInput, newName);
    await this.click(this.saveProfileButton);
  }
}

