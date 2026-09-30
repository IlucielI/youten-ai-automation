import { Page, Locator } from '@playwright/test';
import { BaseComponent } from '../../core/BaseComponent';

/**
 * AlertBanner handles flash messages, notifications, and alert banners
 */
export class AlertBanner extends BaseComponent {
  readonly messageText: Locator;
  readonly closeButton: Locator;

  constructor(page: Page, rootSelector: string = '#flash, .flash, [role="alert"]') {
    super(page, rootSelector);
    this.messageText = this.root;
    this.closeButton = this.root.locator('.close, button.close, [aria-label="Close"]');
  }

  async getMessage(): Promise<string> {
    const raw = await this.root.innerText();
    // Strip trailing '×' or whitespace from close buttons
    return raw.replace(/[\n\r×]+/g, ' ').trim();
  }

  async close(): Promise<void> {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    }
  }

  async expectMessageContains(text: string): Promise<void> {
    await this.expectVisible();
    const content = await this.getMessage();
    if (!content.includes(text)) {
      throw new Error(`Expected alert to contain "${text}", but got "${content}"`);
    }
  }
}

export default AlertBanner;
