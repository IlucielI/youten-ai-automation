import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenShareViewerPage extends BasePage {
  readonly container: Locator;
  readonly publicBadge: Locator;
  readonly audioPlayer: Locator;
  readonly summaryTabTrigger: Locator;
  readonly transcriptTabTrigger: Locator;
  readonly summaryViewer: Locator;
  readonly transcriptViewer: Locator;
  readonly toggleChatButton: Locator;
  readonly chatPanel: Locator;
  readonly chatInput: Locator;
  readonly sendChatButton: Locator;
  readonly langEnButton: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="shared-recording-container"]');
    this.publicBadge = this.page.locator('text=Shared View, text=Tampilan Publik').first();
    this.audioPlayer = this.page.locator('[data-testid="audio-player-container"]');
    this.summaryTabTrigger = this.page.locator('[data-testid="tab-trigger-summary"]');
    this.transcriptTabTrigger = this.page.locator('[data-testid="tab-trigger-transcript"]');
    this.summaryViewer = this.page.locator('[data-testid="summary-viewer"]');
    this.transcriptViewer = this.page.locator('[data-testid="shared-transcript-list"]');
    this.toggleChatButton = this.page.locator('[data-testid="toggle-chat-panel-btn"]');
    this.chatPanel = this.page.locator('[data-testid="chat-panel"]');
    this.chatInput = this.page.locator('[data-testid="chat-input-textarea"]');
    this.sendChatButton = this.page.locator('[data-testid="send-chat-btn"]');
    this.langEnButton = this.page.locator('[data-testid="lang-btn-en"]').first();
  }

  async open(shareToken: string): Promise<void> {
    Logger.step(`Navigating to shared recording viewer with token: ${shareToken}`);
    await this.goto(`/share/${shareToken}`);
    await this.expectVisible(this.container);
  }

  async switchToTranscriptTab(): Promise<void> {
    Logger.step('Switching shared view to Transcript tab');
    await this.click(this.transcriptTabTrigger);
    await this.expectVisible(this.transcriptViewer);
  }
}
