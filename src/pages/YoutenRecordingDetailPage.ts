import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenRecordingDetailPage extends BasePage {
  readonly container: Locator;
  readonly audioPlayer: Locator;
  readonly transcriptViewer: Locator;
  readonly chatInput: Locator;
  readonly sendChatButton: Locator;
  readonly shareButton: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="recording-detail-page"]');
    this.audioPlayer = this.page.locator('[data-testid="audio-player"]');
    this.transcriptViewer = this.page.locator('[data-testid="transcript-viewer"]');
    this.chatInput = this.page.locator('[data-testid="chat-input"]');
    this.sendChatButton = this.page
      .locator('[data-testid="chat-send-btn"], button[type="submit"]:has-text("Kirim")')
      .first();
    this.shareButton = this.page
      .locator('button:has-text("Bagikan"), [data-testid="share-btn"]')
      .first();
  }

  async open(recordingId: string): Promise<void> {
    Logger.step(`Navigating to recording detail workspace: ${recordingId}`);
    await this.goto(`/${recordingId}`);
    await this.expectVisible(this.container);
  }

  async sendChatMessage(message: string): Promise<void> {
    Logger.step(`Sending AI chat prompt: ${message}`);
    await this.fill(this.chatInput, message);
    await this.click(this.sendChatButton);
  }
}
