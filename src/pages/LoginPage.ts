import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { AlertBanner } from './components/AlertBanner';
import Logger from '../utils/logger';

export class LoginPage extends BasePage {
  readonly urlPath = '/login';

  // Locators
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alertBanner: AlertBanner;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.locator('h2');
    this.usernameInput = this.page.locator('#username');
    this.passwordInput = this.page.locator('#password');
    this.submitButton = this.page.locator('button[type="submit"]');
    this.alertBanner = new AlertBanner(page);
  }

  /**
   * Open the login page
   */
  async open(): Promise<void> {
    await this.goto(this.urlPath);
    await this.expectVisible(this.heading);
  }

  /**
   * Execute full login sequence
   */
  async login(username: string, password: string): Promise<void> {
    Logger.step(`Logging in with username: ${username}`);
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password, { maskLog: true });
    await this.click(this.submitButton);
  }

  /**
   * Verify login error banner
   */
  async expectErrorMessage(expectedMessage: string): Promise<void> {
    await this.alertBanner.expectMessageContains(expectedMessage);
  }
}

export default LoginPage;
