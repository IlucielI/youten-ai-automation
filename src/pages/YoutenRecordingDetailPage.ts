import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenRecordingDetailPage extends BasePage {
  readonly container: Locator;
  readonly title: Locator;
  readonly audioPlayer: Locator;
  readonly summaryTabTrigger: Locator;
  readonly transcriptTabTrigger: Locator;
  readonly chaptersTabTrigger: Locator;
  readonly analyticsTabTrigger: Locator;
  readonly summaryViewer: Locator;
  readonly momRenderer: Locator;
  readonly generalRenderer: Locator;
  readonly techReviewRenderer: Locator;
  readonly markdownFallback: Locator;
  readonly transcriptList: Locator;
  readonly toggleChatButton: Locator;
  readonly chatPanel: Locator;
  readonly chatInput: Locator;
  readonly sendChatButton: Locator;
  readonly chatErrorBanner: Locator;
  readonly chatErrorRetryButton: Locator;
  readonly chatEmptyResponseError: Locator;
  readonly shareButton: Locator;
  readonly exportMenuTrigger: Locator;
  readonly langEnButton: Locator;
  readonly langIdButton: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="recording-detail-container"]');
    this.title = this.page.locator('[data-testid="recording-title"]');
    this.audioPlayer = this.page.locator('[data-testid="audio-player-container"]');
    this.summaryTabTrigger = this.page.locator('[data-testid="tab-trigger-summary"]');
    this.transcriptTabTrigger = this.page.locator('[data-testid="tab-trigger-transcript"]');
    this.chaptersTabTrigger = this.page.locator('[data-testid="tab-trigger-chapters"]');
    this.analyticsTabTrigger = this.page.locator('[data-testid="tab-trigger-analytics"]');
    this.summaryViewer = this.page.locator('[data-testid="summary-viewer"]');
    this.momRenderer = this.page.locator('[data-testid="mom-summary-renderer"]');
    this.generalRenderer = this.page.locator('[data-testid="general-summary-renderer"]');
    this.techReviewRenderer = this.page.locator('[data-testid="tech-review-summary-renderer"]');
    this.markdownFallback = this.page.locator('[data-testid="markdown-summary-fallback"]');
    this.transcriptList = this.page.locator('[data-testid="transcript-segments-list"]');
    this.toggleChatButton = this.page.locator('[data-testid="toggle-chat-panel-btn"]');
    this.chatPanel = this.page.locator('[data-testid="chat-panel"]');
    this.chatInput = this.page.locator('[data-testid="chat-input-textarea"]');
    this.sendChatButton = this.page.locator('[data-testid="send-chat-btn"]');
    this.chatErrorBanner = this.page.locator('[data-testid="chat-error-banner"]');
    this.chatErrorRetryButton = this.page.locator('[data-testid="error-retry-chat-btn"]');
    this.chatEmptyResponseError = this.page.locator('[data-testid="chat-empty-response-error"]');
    this.shareButton = this.page.locator('[data-testid="open-share-dialog-btn"]');
    this.exportMenuTrigger = this.page.locator('[data-testid="export-menu-trigger"]');
    this.langEnButton = this.page.locator('[data-testid="lang-btn-en"]').first();
    this.langIdButton = this.page.locator('[data-testid="lang-btn-id"]').first();
  }

  async open(recordingId: string): Promise<void> {
    Logger.step(`Navigating to recording detail workspace: ${recordingId}`);
    await this.goto(`/recordings/${recordingId}`);
    await this.expectVisible(this.container);
  }

  async openChatPanel(): Promise<void> {
    Logger.step('Opening Ask AI chat panel');
    if (!(await this.chatPanel.isVisible())) {
      await this.click(this.toggleChatButton);
    }
    await this.expectVisible(this.chatPanel);
  }

  async sendChatMessage(message: string): Promise<void> {
    Logger.step(`Sending AI chat prompt: ${message}`);
    await this.openChatPanel();
    await this.fill(this.chatInput, message);
    await this.click(this.sendChatButton);
  }

  async switchToTranscriptTab(): Promise<void> {
    Logger.step('Switching to Transcript tab');
    await this.click(this.transcriptTabTrigger);
    await this.expectVisible(this.transcriptList);
  }

  async editSegmentText(segmentId: string, updatedText: string): Promise<void> {
    Logger.step(`Editing transcript segment inline: ${segmentId}`);
    const card = this.page.locator(`[data-testid="transcript-segment-card-${segmentId}"]`);
    await this.click(card.locator('[data-testid="edit-segment-button"]'));
    await this.fill(card.locator('[data-testid="edit-segment-textarea"]'), updatedText);
    await this.click(card.locator('[data-testid="save-segment-edit-button"]'));
  }

  async switchLanguage(lang: 'en' | 'id'): Promise<void> {
    Logger.step(`Switching UI language to: ${lang}`);
    await this.click(lang === 'en' ? this.langEnButton : this.langIdButton);
  }
}
