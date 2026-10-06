import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenDashboardPage extends BasePage {
  readonly urlPath = '/dashboard';

  readonly container: Locator;
  readonly searchInput: Locator;
  readonly newRecordingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="dashboard-page"]');
    this.searchInput = this.page.locator('input[placeholder*="Cari"]');
    this.newRecordingButton = this.page
      .locator('button:has-text("Rekaman Baru"), a[href="/"] button')
      .first();
  }

  async open(): Promise<void> {
    Logger.step('Navigating to user dashboard');
    await this.goto(this.urlPath);
    await this.expectVisible(this.container);
  }
}
