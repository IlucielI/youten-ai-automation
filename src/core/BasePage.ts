import { Page, Locator, expect } from '@playwright/test';
import Logger from '../utils/logger';
import { captureScreenshot, maskSensitive } from '../utils/helpers';

/**
 * BasePage is the foundation for all Page Objects in the Page Object Model (POM).
 * It encapsulates common Playwright actions, smart waiting, logging, and assertions.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Helper to resolve either a selector string or an existing Locator
   */
  resolveLocator(target: Locator | string): Locator {
    return typeof target === 'string' ? this.page.locator(target) : target;
  }

  /**
   * Navigates to a specific URL or relative path
   */
  async goto(pathOrUrl: string = '', options?: Parameters<Page['goto']>[1]): Promise<void> {
    Logger.step(`Navigating to: ${pathOrUrl}`);
    await this.page.goto(pathOrUrl, {
      waitUntil: 'domcontentloaded',
      ...options,
    });
  }

  /**
   * Wait for specific page lifecycle state
   */
  async waitForLoadState(
    state: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded',
  ): Promise<void> {
    Logger.debug(`Waiting for page load state: ${state}`);
    await this.page.waitForLoadState(state);
  }

  /**
   * Click an element with logging and auto-waiting
   */
  async click(target: Locator | string, options?: Parameters<Locator['click']>[0]): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Clicking element: ${locator}`);
    await locator.click(options);
  }

  /**
   * Fill input element with logging (supports masking sensitive values)
   */
  async fill(
    target: Locator | string,
    value: string,
    options?: { maskLog?: boolean; timeout?: number },
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    const displayValue = options?.maskLog ? maskSensitive(value) : value;
    Logger.debug(`Filling element ${locator} with: "${displayValue}"`);
    await locator.fill(value, { timeout: options?.timeout });
  }

  /**
   * Type text character-by-character (useful for input triggers/autocomplete)
   */
  async type(target: Locator | string, value: string, delayMs: number = 50): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Typing into element ${locator}`);
    await locator.pressSequentially(value, { delay: delayMs });
  }

  /**
   * Clear text from an input
   */
  async clear(target: Locator | string): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Clearing input: ${locator}`);
    await locator.clear();
  }

  /**
   * Retrieve inner text of an element
   */
  async getText(target: Locator | string): Promise<string> {
    const locator = this.resolveLocator(target);
    const text = (await locator.innerText()).trim();
    Logger.debug(`Retrieved text: "${text}" from ${locator}`);
    return text;
  }

  /**
   * Retrieve attribute value of an element
   */
  async getAttribute(target: Locator | string, name: string): Promise<string | null> {
    const locator = this.resolveLocator(target);
    return await locator.getAttribute(name);
  }

  /**
   * Check if element is currently visible
   */
  async isVisible(target: Locator | string): Promise<boolean> {
    const locator = this.resolveLocator(target);
    return await locator.isVisible();
  }

  /**
   * Wait for element state
   */
  async waitForElement(
    target: Locator | string,
    state: 'visible' | 'hidden' | 'attached' | 'detached' = 'visible',
    timeout?: number,
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Waiting for element ${locator} to be ${state}`);
    await locator.waitFor({ state, timeout });
  }

  /**
   * Scroll element into view if needed
   */
  async scrollToElement(target: Locator | string): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Scrolling to element: ${locator}`);
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Select dropdown option by value or label
   */
  async selectOption(
    target: Locator | string,
    valueOrLabel: string | { value?: string; label?: string; index?: number },
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Selecting option on ${locator}`);
    await locator.selectOption(valueOrLabel);
  }

  /**
   * Check a checkbox or radio button
   */
  async check(target: Locator | string): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Checking element: ${locator}`);
    await locator.check();
  }

  /**
   * Uncheck a checkbox
   */
  async uncheck(target: Locator | string): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.debug(`Unchecking element: ${locator}`);
    await locator.uncheck();
  }

  /**
   * Take screenshot of current page
   */
  async takeScreenshot(filename: string, description?: string): Promise<string> {
    return await captureScreenshot(this.page, filename, { description });
  }

  // ============================================================================
  // ASSERTIONS (Auto-retrying assertions powered by @playwright/test expect)
  // ============================================================================

  async expectVisible(target: Locator | string, message?: string): Promise<void> {
    const locator = this.resolveLocator(target);
    await expect(locator, message).toBeVisible();
  }

  async expectNotVisible(target: Locator | string, message?: string): Promise<void> {
    const locator = this.resolveLocator(target);
    await expect(locator, message).not.toBeVisible();
  }

  async expectText(
    target: Locator | string,
    expected: string | RegExp,
    message?: string,
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    await expect(locator, message).toHaveText(expected);
  }

  async expectContainText(
    target: Locator | string,
    expected: string | RegExp,
    message?: string,
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    await expect(locator, message).toContainText(expected);
  }

  async expectValue(
    target: Locator | string,
    expected: string | RegExp,
    message?: string,
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    await expect(locator, message).toHaveValue(expected);
  }

  async expectUrl(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expected);
  }

  async expectTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }

  // ============================================================================
  // VISUAL REGRESSION TESTING (Pixel-by-pixel snapshot comparison)
  // ============================================================================

  /**
   * Compares full page visual screenshot against golden baseline
   */
  async expectVisualSnapshot(
    snapshotName: string,
    options?: Parameters<ReturnType<typeof expect<Page>>['toHaveScreenshot']>[0],
  ): Promise<void> {
    Logger.step(`[VISUAL] Verifying page visual snapshot: ${snapshotName}`);
    await expect(this.page).toHaveScreenshot(snapshotName, {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      ...options,
    });
  }

  /**
   * Compares element/component visual screenshot against golden baseline
   */
  async expectElementVisualSnapshot(
    target: Locator | string,
    snapshotName: string,
    options?: Parameters<ReturnType<typeof expect<Locator>>['toHaveScreenshot']>[0],
  ): Promise<void> {
    const locator = this.resolveLocator(target);
    Logger.step(`[VISUAL] Verifying element visual snapshot: ${snapshotName}`);
    await expect(locator).toHaveScreenshot(snapshotName, {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      ...options,
    });
  }
}

export default BasePage;
