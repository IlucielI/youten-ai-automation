import { Page, Locator, expect } from '@playwright/test';
import { BaseComponent } from '../../core/BaseComponent';
import Logger from '../../utils/logger';

export type BotProviderKey = 'google_meet' | 'zoom' | 'teams' | 'discord';

export interface BotMetadataOptions {
  title?: string;
  template?: 'MOM' | 'EXECUTIVE' | 'ACTION_ITEMS' | 'STANDUP';
  language?: 'id' | 'en';
}

/**
 * MeetingBotComponent encapsulates user interaction with the Meeting Voice Bot tab,
 * including provider selection, meeting form inputs, validation alerts,
 * and the live session tracker widget.
 */
export class MeetingBotComponent extends BaseComponent {
  // Form & Provider Locators
  readonly form: Locator;
  readonly providerSelector: Locator;
  readonly meetingUrlInput: Locator;
  readonly discordGuildIdInput: Locator;
  readonly discordChannelIdInput: Locator;
  readonly meetingTitleInput: Locator;
  readonly meetingTemplateSelect: Locator;
  readonly meetingLanguageSelect: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  // Live Tracker Locators
  readonly liveTracker: Locator;
  readonly statusPill: Locator;
  readonly stopButton: Locator;
  readonly viewNotulaButton: Locator;
  readonly resetSessionButton: Locator;
  readonly retrySessionButton: Locator;

  constructor(page: Page, rootSelector: string = '[data-testid="voice-bot-tab-content"]') {
    super(page, rootSelector);

    // Form elements
    this.form = this.root.locator('[data-testid="meeting-bot-form"]');
    this.providerSelector = this.root.locator('[data-testid="provider-selector"]');
    this.meetingUrlInput = this.root.locator('[data-testid="meeting-url-input"]');
    this.discordGuildIdInput = this.root.locator('[data-testid="discord-guild-id-input"]');
    this.discordChannelIdInput = this.root.locator('[data-testid="discord-channel-id-input"]');
    this.meetingTitleInput = this.root.locator('[data-testid="meeting-title-input"]');
    this.meetingTemplateSelect = this.root.locator('[data-testid="meeting-template-select"]');
    this.meetingLanguageSelect = this.root.locator('[data-testid="meeting-language-select"]');
    this.submitButton = this.root.locator('[data-testid="meeting-bot-submit-btn"]');
    this.errorAlert = this.root.locator('[data-testid="meeting-bot-error-alert"]');

    // Live Tracker elements
    this.liveTracker = this.root.locator('[data-testid="live-bot-tracker"]');
    this.statusPill = this.root.locator('[data-testid="live-bot-status-pill"]');
    this.stopButton = this.root.locator('[data-testid="stop-bot-btn"]');
    this.viewNotulaButton = this.root.locator('[data-testid="view-notula-btn"]');
    this.resetSessionButton = this.root.locator('[data-testid="reset-session-btn"]');
    this.retrySessionButton = this.root.locator('[data-testid="retry-new-session-btn"]');
  }

  /**
   * Selects a meeting bot provider (Google Meet, Zoom, MS Teams, Discord)
   */
  async selectProvider(provider: BotProviderKey): Promise<void> {
    Logger.step(`Selecting meeting bot provider: ${provider}`);
    const providerBtn = this.root.locator(`[data-testid="provider-option-${provider}"]`);
    await expect(providerBtn).toBeVisible();
    await providerBtn.click();
    // Verify checkmark indicator is shown for selected provider
    const selectedIndicator = this.root.locator(
      `[data-testid="provider-selected-indicator-${provider}"]`,
    );
    await expect(selectedIndicator).toBeVisible();
  }

  /**
   * Fills the meeting URL for web conference providers (Meet, Zoom, Teams)
   */
  async fillMeetingUrl(url: string): Promise<void> {
    Logger.step(`Entering meeting URL: ${url}`);
    await expect(this.meetingUrlInput).toBeVisible();
    await this.meetingUrlInput.fill(url);
  }

  /**
   * Fills Discord Guild ID and Voice Channel ID
   */
  async fillDiscordDetails(guildId: string, channelId: string): Promise<void> {
    Logger.step(`Entering Discord details: guild=${guildId}, channel=${channelId}`);
    await expect(this.discordGuildIdInput).toBeVisible();
    await this.discordGuildIdInput.fill(guildId);
    await expect(this.discordChannelIdInput).toBeVisible();
    await this.discordChannelIdInput.fill(channelId);
  }

  /**
   * Fills optional metadata like title, template, and language
   */
  async fillMetadata(options: BotMetadataOptions): Promise<void> {
    if (options.title) {
      Logger.step(`Setting meeting title: ${options.title}`);
      await this.meetingTitleInput.fill(options.title);
    }
    if (options.template) {
      Logger.step(`Selecting meeting template: ${options.template}`);
      await this.meetingTemplateSelect.selectOption(options.template);
    }
    if (options.language) {
      Logger.step(`Selecting meeting language: ${options.language}`);
      await this.meetingLanguageSelect.selectOption(options.language);
    }
  }

  /**
   * Submits the bot dispatch form
   */
  async submit(): Promise<void> {
    Logger.step('Submitting meeting bot dispatch request');
    await expect(this.submitButton).toBeVisible();
    await this.submitButton.click();
  }

  /**
   * Asserts that a client-side validation error or store error is displayed
   */
  async expectErrorAlert(expectedSnippet?: string): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    if (expectedSnippet) {
      await expect(this.errorAlert).toContainText(expectedSnippet);
    }
  }

  /**
   * Asserts that the live bot tracker is rendered and active
   */
  async expectTrackerVisible(): Promise<void> {
    Logger.step('Verifying live bot tracker widget is visible');
    await expect(this.liveTracker).toBeVisible();
  }

  /**
   * Asserts that the live status pill contains the expected status text
   */
  async expectStatus(statusSnippet: string): Promise<void> {
    Logger.step(`Verifying bot status contains: ${statusSnippet}`);
    await expect(this.statusPill).toBeVisible();
    await expect(this.statusPill).toContainText(statusSnippet);
  }

  /**
   * Clicks the stop bot button to end session
   */
  async stopBot(): Promise<void> {
    Logger.step('Stopping live meeting bot session');
    await expect(this.stopButton).toBeVisible();
    await this.stopButton.click();
  }

  /**
   * Asserts that the recording is completed and view notula button is available
   */
  async expectCompleted(): Promise<void> {
    Logger.step('Verifying bot session completed successfully');
    await expect(this.viewNotulaButton).toBeVisible();
  }

  /**
   * Resets the session back to the input form
   */
  async resetSession(): Promise<void> {
    Logger.step('Resetting session to start new bot');
    await expect(this.resetSessionButton).toBeVisible();
    await this.resetSessionButton.click();
    await expect(this.form).toBeVisible();
  }
}

export default MeetingBotComponent;
