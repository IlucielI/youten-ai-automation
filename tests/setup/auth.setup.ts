import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../../src/pages/LoginPage';
import { SecureAreaPage } from '../../src/pages/SecureAreaPage';
import Logger from '../../src/utils/logger';

export const AUTH_FILE = path.resolve(process.cwd(), 'playwright/.auth/user.json');

setup('Authenticate and persist storage state', async ({ page }) => {
  Logger.step('Running global authentication setup...');

  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  // 1. Navigate to login page
  await loginPage.open();

  // 2. Perform authentication with valid credentials
  await loginPage.login('tomsmith', 'SuperSecretPassword!');

  // 3. Verify user reached authenticated area
  await secureAreaPage.expectLoggedIn();
  await expect(page).toHaveURL(/.*\/secure/);

  // 4. Ensure destination directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 5. Dump cookies and local/session storage to JSON file
  await page.context().storageState({ path: AUTH_FILE });
  Logger.success(`Authentication storage state successfully saved to: ${AUTH_FILE}`);
});
