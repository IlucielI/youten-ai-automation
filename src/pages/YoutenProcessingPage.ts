import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenProcessingPage extends BasePage {
  readonly container: Locator;
  readonly statusHeading: Locator;
  readonly stepper: Locator;
  readonly viewResultButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="processing-page-container"]');
    this.statusHeading = this.page.locator('[data-testid="recording-title-display"], h1').first();
    this.stepper = this.page.locator('[data-testid="processing-pipeline-stepper"]');
    this.viewResultButton = this.page.locator('button:has-text("Lihat Hasil"), button:has-text("View Result")').first();
    this.cancelButton = this.page.locator('[data-testid="header-cancel-button"]');
  }

  async open(recordingId: string): Promise<void> {
    Logger.step(`Navigating to processing page for recording: ${recordingId}`);
    await this.goto(`/recordings/${recordingId}/processing`);
    await this.expectVisible(this.container);
  }
}
