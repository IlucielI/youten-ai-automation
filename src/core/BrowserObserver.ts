import { Page, TestInfo } from '@playwright/test';
import Logger from '../utils/logger';
import { config } from '../config';

export interface BrowserDiagnosticLog {
  timestamp: string;
  type: 'console_error' | 'console_warn' | 'uncaught_exception' | 'request_failed' | 'http_error';
  url: string;
  message: string;
  status?: number;
}

/**
 * BrowserObserver actively monitors, intercepts, and reports browser console errors,
 * uncaught JavaScript runtime exceptions, and network request failures during test execution.
 */
export class BrowserObserver {
  private readonly logs: BrowserDiagnosticLog[] = [];
  private readonly ignoredPatterns = [
    'Download the React DevTools',
    'favicon.ico',
    '[Fast Refresh]',
    'Content-Security-Policy',
    'Third-party cookie',
  ];

  /**
   * Attaches real-time listeners to the given Playwright Page
   */
  attach(page: Page): void {
    if (!config.captureBrowserLogs) return;

    // 1. Intercept Browser Console Messages (Errors & Warnings)
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error' || type === 'warning') {
        if (this.ignoredPatterns.some((pattern) => text.includes(pattern))) return;

        const logEntry: BrowserDiagnosticLog = {
          timestamp: new Date().toISOString(),
          type: type === 'error' ? 'console_error' : 'console_warn',
          url: page.url(),
          message: text,
        };
        this.logs.push(logEntry);

        if (type === 'error') {
          Logger.error(`[BROWSER CONSOLE ERROR] ${text} (Page: ${page.url()})`);
        } else {
          Logger.warn(`[BROWSER CONSOLE WARN] ${text}`);
        }
      }
    });

    // 2. Intercept Uncaught Client-side JavaScript Runtime Exceptions
    page.on('pageerror', (error) => {
      const logEntry: BrowserDiagnosticLog = {
        timestamp: new Date().toISOString(),
        type: 'uncaught_exception',
        url: page.url(),
        message: error.message,
      };
      this.logs.push(logEntry);
      Logger.error(`[BROWSER UNCAUGHT EXCEPTION] ${error.message} (Page: ${page.url()})`);
    });

    // 3. Intercept Failed Network Requests (DNS, CORS, ERR_CONNECTION_REFUSED)
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      const errorText = failure?.errorText || 'Unknown Network Failure';

      // Ignore canceled requests caused by regular page unloads/navigation
      if (errorText.includes('net::ERR_ABORTED')) return;

      const logEntry: BrowserDiagnosticLog = {
        timestamp: new Date().toISOString(),
        type: 'request_failed',
        url: request.url(),
        message: `${request.method()} ${request.url()} failed: ${errorText}`,
      };
      this.logs.push(logEntry);
      Logger.error(`[NETWORK FAILED] [${request.method()}] ${request.url()} -> ${errorText}`);
    });

    // 4. Intercept HTTP 4xx Client Errors and 5xx Server Errors
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();

      if (status >= 400 && !url.includes('favicon.ico')) {
        const logEntry: BrowserDiagnosticLog = {
          timestamp: new Date().toISOString(),
          type: 'http_error',
          url,
          status,
          message: `HTTP ${status} ${response.statusText()}`,
        };
        this.logs.push(logEntry);

        if (status >= 500) {
          Logger.error(
            `[NETWORK HTTP ${status}] [${response.request().method()}] ${url} -> ${response.statusText()}`,
          );
        } else {
          Logger.warn(`[NETWORK HTTP ${status}] [${response.request().method()}] ${url}`);
        }
      }
    });
  }

  /**
   * Returns all captured diagnostic logs for this test
   */
  getLogs(): BrowserDiagnosticLog[] {
    return [...this.logs];
  }

  /**
   * Returns only errors (console errors, uncaught exceptions, and failed requests)
   */
  getErrors(): BrowserDiagnosticLog[] {
    return this.logs.filter(
      (l) =>
        l.type === 'console_error' ||
        l.type === 'uncaught_exception' ||
        l.type === 'request_failed',
    );
  }

  /**
   * Attaches captured diagnostic logs as a JSON artifact in Playwright HTML Report
   */
  attachToTestReport(testInfo: TestInfo): void {
    if (this.logs.length > 0) {
      testInfo.attach('browser-diagnostics.json', {
        body: JSON.stringify(this.logs, null, 2),
        contentType: 'application/json',
      });
    }
  }
}

export default BrowserObserver;
