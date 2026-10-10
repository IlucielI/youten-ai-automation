import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenProcessingPage extends BasePage {
  readonly container: Locator;
  readonly statusHeading: Locator;
  readonly stepper: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="progress-page"]');
    this.statusHeading = this.page.locator('h1, h2').first();
    this.stepper = this.page
      .locator('[data-testid="progress-stepper"], nav[aria-label="Progress"]')
      .first();
  }

  async open(recordingId: string): Promise<void> {
    Logger.step(`Navigating to processing page for recording: ${recordingId}`);
    await this.goto(`/processing?id=${recordingId}`);
    await this.expectVisible(this.container);
  }
}
