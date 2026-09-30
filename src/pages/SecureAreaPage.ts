import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { AlertBanner } from './components/AlertBanner';
import Logger from '../utils/logger';

export class SecureAreaPage extends BasePage {
  readonly heading: Locator;
  readonly subHeader: Locator;
  readonly logoutButton: Locator;
  readonly alertBanner: AlertBanner;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.locator('h2');
    this.subHeader = this.page.locator('h4.subheader');
    this.logoutButton = this.page.locator('a[href="/logout"]');
    this.alertBanner = new AlertBanner(page);
  }

  async expectLoggedIn(): Promise<void> {
    Logger.step('Verifying user is successfully logged in to Secure Area');
    await this.expectVisible(this.heading);
    await this.expectContainText(this.heading, 'Secure Area');
    await this.expectVisible(this.logoutButton);
  }

  async logout(): Promise<void> {
    Logger.step('Logging out from Secure Area');
    await this.click(this.logoutButton);
  }
}

export default SecureAreaPage;
