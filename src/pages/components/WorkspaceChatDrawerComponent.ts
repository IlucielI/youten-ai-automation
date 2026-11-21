import { Page, Locator, expect } from '@playwright/test';
import { BaseComponent } from '../../core/BaseComponent';
import Logger from '../../utils/logger';

/**
 * WorkspaceChatDrawerComponent encapsulates interactions with the Multi-Meeting Ask AI
 * sliding drawer, session switcher, typewriter streaming responses, and citation cards.
 */
export class WorkspaceChatDrawerComponent extends BaseComponent {
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly newSessionButton: Locator;
  readonly starterChipsContainer: Locator;
  readonly starterChips: Locator;
  readonly chatHistory: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly citationsGrid: Locator;
  readonly citationCards: Locator;

  constructor(page: Page, rootSelector: string = '[data-testid="workspace-chat-drawer"]') {
    super(page, rootSelector);

    this.title = this.root.locator('[data-testid="workspace-chat-drawer-title"]');
    this.closeButton = this.root.locator('[data-testid="close-chat-drawer-btn"]');
    this.newSessionButton = this.root.locator('[data-testid="new-chat-session-btn"]');
    this.starterChipsContainer = this.root.locator('[data-testid="chat-starter-chips"]');
    this.starterChips = this.root.locator('[data-testid="chat-starter-chips"] button');
    this.chatHistory = this.root.locator('[data-testid="chat-history-list"]');
    this.userMessages = this.root.locator('[data-testid="chat-message-user"]');
    this.assistantMessages = this.root.locator('[data-testid="chat-message-assistant"]');
    this.chatInput = this.root.locator('[data-testid="workspace-chat-input"]');
    this.sendButton = this.root.locator('[data-testid="send-workspace-chat-btn"]');
    this.citationsGrid = this.root.locator('[data-testid="citations-grid"]');
    this.citationCards = this.root.locator('[data-testid="citation-card"]');
  }

  async expectOpen(): Promise<void> {
    Logger.step('Asserting Workspace Chat Drawer is open');
    await expect(this.root).toBeVisible();
  }

  async expectClosed(): Promise<void> {
    Logger.step('Asserting Workspace Chat Drawer is closed');
    await expect(this.root).not.toBeVisible();
  }

  async getTitleText(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  async close(): Promise<void> {
    Logger.step('Closing Workspace Chat Drawer');
    await this.closeButton.click();
    await this.expectClosed();
  }

  async startNewSession(): Promise<void> {
    Logger.step('Starting a new chat session');
    await this.newSessionButton.click();
  }

  async clickStarterChip(index: number = 0): Promise<void> {
    Logger.step(`Clicking starter chip at index ${index}`);
    await this.starterChips.nth(index).click();
  }

  async sendQuestion(question: string): Promise<void> {
    Logger.step(`Submitting question to chat: "${question}"`);
    await this.chatInput.fill(question);
    await this.sendButton.click();
  }

  async expectAssistantResponse(expectedTextSubstring?: string): Promise<void> {
    Logger.step('Waiting for assistant response to appear');
    const latestAssistant = this.assistantMessages.last();
    await expect(latestAssistant).toBeVisible({ timeout: 15000 });
    if (expectedTextSubstring) {
      await expect(latestAssistant).toContainText(expectedTextSubstring);
    }
  }

  async expectCitationsVisible(minimumCount: number = 1): Promise<void> {
    Logger.step(`Asserting at least ${minimumCount} citation cards are rendered`);
    await expect(this.citationsGrid.first()).toBeVisible({ timeout: 10000 });
    const count = await this.citationCards.count();
    expect(count).toBeGreaterThanOrEqual(minimumCount);
  }
}

