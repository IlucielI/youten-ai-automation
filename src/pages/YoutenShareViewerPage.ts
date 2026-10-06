import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenShareViewerPage extends BasePage {
  readonly container: Locator;
  readonly poweredByBadge: Locator;
  readonly audioPlayer: Locator;
  readonly transcriptViewer: Locator;
  readonly chatInput: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="share-viewer-page"]');
    this.poweredByBadge = this.page.locator('text=Powered by Youten AI');
    this.audioPlayer = this.page.locator('[data-testid="audio-player"]');
    this.transcriptViewer = this.page.locator('[data-testid="transcript-viewer"]');
    this.chatInput = this.page.locator('[data-testid="chat-input"]');
  }

  async open(shareToken: string): Promise<void> {
    Logger.step(`Navigating to shared recording viewer with token: ${shareToken}`);
    await this.goto(`/share/${shareToken}`);
    await this.expectVisible(this.container);
  }
}
