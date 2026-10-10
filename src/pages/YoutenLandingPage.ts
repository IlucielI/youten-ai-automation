import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';
import { MeetingBotComponent } from './components/MeetingBotComponent';

export class YoutenLandingPage extends BasePage {
  readonly urlPath = '/';

  readonly heroHeading: Locator;
  readonly fileInput: Locator;
  readonly urlTabTrigger: Locator;
  readonly urlInput: Locator;
  readonly processUrlButton: Locator;
  readonly botTabTrigger: Locator;
  readonly meetingBot: MeetingBotComponent;

  constructor(page: Page) {
    super(page);
    this.heroHeading = this.page.locator('h1');
    this.fileInput = this.page.locator('input[type="file"]');
    this.urlTabTrigger = this.page
      .locator('button:has-text("Impor Tautan"), button:has-text("URL")')
      .first();
    this.urlInput = this.page.locator('input[placeholder*="http"], input[name="url"]').first();
    this.processUrlButton = this.page
      .locator('button:has-text("Proses Tautan"), button:has-text("Mulai")')
      .first();
    this.botTabTrigger = this.page.locator('[data-testid="tab-bot"]');
    this.meetingBot = new MeetingBotComponent(this.page);
  }

  async open(): Promise<void> {
    Logger.step('Navigating to Youten AI landing page');
    await this.goto(this.urlPath);
    await this.expectVisible(this.heroHeading);
  }

  async uploadAudio(filePath: string): Promise<void> {
    Logger.step(`Uploading audio file from: ${filePath}`);
    await this.fileInput.setInputFiles(filePath);
  }

  async switchToMeetingBotTab(): Promise<void> {
    Logger.step('Switching to Meeting Bot (Bot Rapat) tab');
    await expect(this.botTabTrigger).toBeVisible();
    await this.botTabTrigger.click();
    await this.meetingBot.waitForVisible();
  }
}
