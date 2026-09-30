import { Page, Locator, expect } from '@playwright/test';
import Logger from '../utils/logger';

/**
 * BaseComponent is the foundation for reusable UI widgets and components
 * such as Navigation bars, Modals, Forms, and Notification toasts.
 */
export abstract class BaseComponent {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page, rootLocator: Locator | string) {
    this.page = page;
    this.root = typeof rootLocator === 'string' ? page.locator(rootLocator) : rootLocator;
  }

  /**
   * Scopes a locator within this component's root
   */
  resolveLocator(target: Locator | string): Locator {
    return typeof target === 'string' ? this.root.locator(target) : target;
  }

  async isVisible(): Promise<boolean> {
    return await this.root.isVisible();
  }

  async waitForVisible(timeout?: number): Promise<void> {
    Logger.debug(`Waiting for component ${this.root} to be visible`);
    await this.root.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(timeout?: number): Promise<void> {
    Logger.debug(`Waiting for component ${this.root} to be hidden`);
    await this.root.waitFor({ state: 'hidden', timeout });
  }

  async expectVisible(message?: string): Promise<void> {
    await expect(this.root, message).toBeVisible();
  }

  async expectNotVisible(message?: string): Promise<void> {
    await expect(this.root, message).not.toBeVisible();
  }

  /**
   * Compares component element screenshot against golden baseline
   */
  async expectVisualSnapshot(
    snapshotName: string,
    options?: Parameters<ReturnType<typeof expect<Locator>>['toHaveScreenshot']>[0],
  ): Promise<void> {
    Logger.step(`[VISUAL] Verifying component visual snapshot: ${snapshotName}`);
    await expect(this.root).toHaveScreenshot(snapshotName, {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      ...options,
    });
  }
}

export default BaseComponent;
