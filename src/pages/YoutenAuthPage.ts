import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenAuthPage extends BasePage {
  readonly registerHeading: Locator;
  readonly loginHeading: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.registerHeading = this.page.locator('h1:has-text("Daftar Akun")');
    this.loginHeading = this.page.locator('h1:has-text("Masuk ke Akun")');
    this.fullNameInput = this.page.locator('input#full_name');
    this.emailInput = this.page.locator('input#email');
    this.passwordInput = this.page.locator('input#password');
    this.submitButton = this.page.locator('button[type="submit"]');
  }

  async openRegister(): Promise<void> {
    Logger.step('Navigating to registration page');
    await this.goto('/register');
    await this.expectVisible(this.registerHeading);
  }

  async openLogin(): Promise<void> {
    Logger.step('Navigating to login page');
    await this.goto('/login');
    await this.expectVisible(this.loginHeading);
  }

  async register(fullName: string, email: string, password: string): Promise<void> {
    Logger.step(`Submitting registration for: ${email}`);
    await this.fill(this.fullNameInput, fullName);
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password, { maskLog: true });
    await this.click(this.submitButton);
  }
}
