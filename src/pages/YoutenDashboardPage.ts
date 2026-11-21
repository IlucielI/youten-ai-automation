import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import Logger from '../utils/logger';

export class YoutenDashboardPage extends BasePage {
  readonly urlPath = '/dashboard';

  readonly container: Locator;
  readonly searchInput: Locator;
  readonly newRecordingButton: Locator;
  readonly folderSidebar: Locator;
  readonly createFolderButton: Locator;
  readonly workspaceSwitcherTrigger: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.locator('[data-testid="dashboard-page"]');
    this.searchInput = this.page.locator('input[placeholder*="Search"], input[placeholder*="Cari"]');
    this.newRecordingButton = this.page
      .locator('a[href="/"] button, button:has-text("New Recording"), button:has-text("Rekaman Baru")')
      .first();
    this.folderSidebar = this.page.locator('[data-testid="folder-sidebar"], aside').first();
    this.createFolderButton = this.page.locator('[data-testid="create-folder-btn"], button[title*="Folder"]').first();
    this.workspaceSwitcherTrigger = this.page.locator('button:has-text("Switch Workspace")');
  }

  async open(): Promise<void> {
    Logger.step('Navigating to user dashboard');
    await this.goto(this.urlPath);
    await this.expectVisible(this.container);
  }

  async createFolder(name: string): Promise<void> {
    Logger.step(`Creating new folder: ${name}`);
    await this.click(this.createFolderButton);
    const input = this.page.locator('[data-testid="folder-name-input"], input#folder-name, input[placeholder*="Sprint"]').first();
    await this.fill(input, name);
    const submitBtn = this.page.locator('[data-testid="submit-folder-btn"], button:has-text("Create Folder"), button:has-text("Buat Folder")').first();
    await this.click(submitBtn);
  }
}
