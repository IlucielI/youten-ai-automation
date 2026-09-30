import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class CheckboxesPage extends BasePage {
  readonly urlPath = '/checkboxes';
  readonly heading: Locator;
  readonly checkbox1: Locator;
  readonly checkbox2: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.locator('h3');
    this.checkbox1 = this.page.locator('input[type="checkbox"]').nth(0);
    this.checkbox2 = this.page.locator('input[type="checkbox"]').nth(1);
  }

  async open(): Promise<void> {
    await this.goto(this.urlPath);
    await this.expectVisible(this.heading);
  }

  async toggleCheckbox(index: 1 | 2): Promise<void> {
    const cb = index === 1 ? this.checkbox1 : this.checkbox2;
    await this.click(cb);
  }

  async isChecked(index: 1 | 2): Promise<boolean> {
    const cb = index === 1 ? this.checkbox1 : this.checkbox2;
    return await cb.isChecked();
  }
}

export default CheckboxesPage;
