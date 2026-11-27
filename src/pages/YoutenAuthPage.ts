import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenAuthPage extends BasePage {
  readonly registerCard: Locator;
  readonly loginCard: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly verifyLoadingCard: Locator;
  readonly verifySuccessCard: Locator;
  readonly verifyErrorAlert: Locator;
  readonly langEnButton: Locator;

  constructor(page: Page) {
    super(page);
    this.registerCard = this.page.locator('[data-testid="register-card"]');
    this.loginCard = this.page.locator('[data-testid="login-card"]');
    this.fullNameInput = this.page
      .locator('[data-testid="register-name-input"], [data-testid="register-fullname-input"], input#register-name, input#full_name')
      .first();
    this.emailInput = this.page
      .locator('[data-testid="login-email-input"], [data-testid="register-email-input"], input#email')
      .first();
    this.passwordInput = this.page
      .locator('[data-testid="login-password-input"], [data-testid="register-password-input"], input#password')
      .first();
    this.submitButton = this.page
      .locator('[data-testid="login-submit-button"], [data-testid="register-submit-button"], button[type="submit"]')
      .first();
    this.verifyLoadingCard = this.page.locator('[data-testid="verify-email-loading-card"]');
    this.verifySuccessCard = this.page.locator('[data-testid="verify-email-success-card"]');
    this.verifyErrorAlert = this.page.locator('[data-testid="verify-email-error"]');
    this.langEnButton = this.page.locator('[data-testid="lang-btn-en"]').first();
  }

  async openRegister(): Promise<void> {
    Logger.step('Navigating to registration page');
    await this.goto('/register');
    await this.expectVisible(this.registerCard);
  }

  async openLogin(): Promise<void> {
    Logger.step('Navigating to login page');
    await this.goto('/login');
    await this.expectVisible(this.loginCard);
  }

  async openVerifyMagicLink(token: string, claimId?: string): Promise<void> {
    Logger.step('Navigating to email verification magic link');
    const url = claimId
      ? `/verify-email?token=${encodeURIComponent(token)}&claim=${encodeURIComponent(claimId)}`
      : `/verify-email?token=${encodeURIComponent(token)}`;
    await this.goto(url);
  }

  async register(fullName: string, email: string, password: string): Promise<void> {
    Logger.step(`Submitting registration for: ${email}`);
    await this.fill(this.fullNameInput, fullName);
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password, { maskLog: true });
    await this.click(this.submitButton);
  }
}
