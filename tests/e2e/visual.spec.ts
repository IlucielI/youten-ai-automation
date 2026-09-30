import { test, expect } from '../../src/fixtures';

test.describe('Visual Regression Testing (Pixel-by-Pixel Snapshot Comparison) @visual', () => {
  test('Authentication card renders pixel-consistent layout @visual', async ({ page }) => {
    // 1. Arrange: Render a deterministic test component card
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; padding: 40px; margin: 0; }
            .card { max-width: 380px; margin: 0 auto; background: #1e293b; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); padding: 28px; border: 1px solid #334155; }
            h2 { margin-top: 0; color: #f8fafc; font-size: 20px; font-weight: 600; text-align: center; }
            .field { margin-bottom: 18px; }
            label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px; color: #94a3b8; }
            input { width: 100%; box-sizing: border-box; padding: 10px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #f8fafc; font-size: 14px; }
            button { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div id="auth-card" class="card">
            <h2>Secure Sign In</h2>
            <div class="field">
              <label for="username">Username</label>
              <input id="username" type="text" value="tomsmith" readonly />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" type="password" value="SuperSecretPassword!" readonly />
            </div>
            <button id="login-button" type="button">Sign In</button>
          </div>
        </body>
      </html>
    `);

    // 2. Act & Assert: Visual snapshot comparison against golden baseline
    const authCard = page.locator('#auth-card');
    await expect(authCard).toBeVisible();

    await expect(authCard).toHaveScreenshot('auth-card.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('Authentication card adheres to Design System tokens (Figma / Penpot spec) @visual @design', async ({
    page,
    designAdapter,
  }) => {
    // 1. Arrange: Render identical component
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; padding: 40px; margin: 0; }
            .card { max-width: 380px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 28px; border: 1px solid #334155; }
            button { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div id="auth-card" class="card">
            <button id="login-button" type="button">Sign In</button>
          </div>
        </body>
      </html>
    `);

    // 2. Fetch Design System Tokens (from Figma, Penpot, or standard corporate baseline)
    const tokens = await designAdapter.getDesignTokens();

    // 3. Assert card container styling matches design token specs
    const cardAudit = await designAdapter.validateElementTokens(page.locator('#auth-card'), {
      backgroundColor: tokens.colors.card, // #1e293b
      borderRadius: tokens.borderRadius.lg, // 12px
    });
    expect(cardAudit.valid).toBe(true);

    // 4. Assert button styling matches primary brand token & button typography
    const buttonAudit = await designAdapter.validateElementTokens(page.locator('#login-button'), {
      backgroundColor: tokens.colors.primary, // #3b82f6
      color: '#ffffff',
      borderRadius: tokens.borderRadius.md, // 8px
      fontSize: tokens.typography.button.fontSize, // 14px
      fontWeight: tokens.typography.button.fontWeight, // 600
    });
    expect(buttonAudit.valid).toBe(true);
  });
});
