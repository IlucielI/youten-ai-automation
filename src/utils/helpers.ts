import * as path from 'path';
import * as fs from 'fs';
import { Page } from '@playwright/test';
import Logger from './logger';

export const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Pauses execution for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a random alphanumeric string
 */
export function randomString(length: number = 8, prefix: string = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random number between min and max (inclusive)
 */
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random email address
 */
export function randomEmail(prefix: string = 'testuser'): string {
  const timestamp = Date.now();
  const rand = randomString(4);
  return `${prefix}_${timestamp}_${rand}@example.com`;
}

/**
 * Masks sensitive strings like passwords, tokens, or NIK
 */
export function maskSensitive(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars) return '****';
  const visible = text.substring(0, visibleChars);
  return `${visible}${'*'.repeat(text.length - visibleChars)}`;
}

/**
 * Capture full page or viewport screenshot cleanly
 */
export async function captureScreenshot(
  page: Page,
  filename: string,
  options: { fullPage?: boolean; description?: string } = {},
): Promise<string> {
  const safeFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, safeFilename);

  try {
    await page.screenshot({
      path: filePath,
      fullPage: options.fullPage ?? true,
    });
    Logger.success(
      `Screenshot saved: ${safeFilename} ${options.description ? `(${options.description})` : ''}`,
    );
    return filePath;
  } catch (error) {
    Logger.error(`Failed to capture screenshot ${safeFilename}`, error);
    throw error;
  }
}
