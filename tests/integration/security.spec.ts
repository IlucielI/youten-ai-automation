import { test, expect } from '../../src/fixtures';

test.describe('Security & Authentication Adapters (2FA TOTP & Captcha)', () => {
  test('TOTP Adapter generates and validates RFC 6238 6-digit 2FA codes @security @totp', async ({
    totp,
  }) => {
    // Standard RFC test secret (Base32 representation)
    const testSecret = 'JBSWY3DPEHPK3PXP';

    // 1. Generate current time-based 6-digit token
    const token = totp.generate(testSecret);
    expect(token).toMatch(/^\d{6}$/);

    // 2. Verify token is cryptographically valid
    const isValid = totp.verify(token, testSecret);
    expect(isValid).toBe(true);

    // 3. Verify invalid token is rejected
    const isInvalidRejected = totp.verify('000000', testSecret);
    expect(isInvalidRejected).toBe(false);

    // 4. Verify remaining window seconds
    const remaining = totp.getRemainingSeconds();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30);
  });

  test('Built-in Captcha Adapter solves reCAPTCHA v2 and Cloudflare Turnstile with zero config @security @captcha', async ({
    captcha,
  }) => {
    const websiteUrl = 'https://demo.playwright.dev';
    const mockSiteKey = '6LeIxacZAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

    // 1. Solve reCAPTCHA v2 (Zero-config bypass)
    const recaptchaToken = await captcha.solveRecaptchaV2(websiteUrl, mockSiteKey);
    expect(recaptchaToken).toBeDefined();
    expect(recaptchaToken.length).toBeGreaterThan(0);
    expect(recaptchaToken).toContain('recaptcha');

    // 2. Solve Cloudflare Turnstile (Zero-config bypass)
    const turnstileToken = await captcha.solveTurnstile(websiteUrl, '0x4AAAAAAABkAYgq7n908vIe');
    expect(turnstileToken).toBeDefined();
    expect(turnstileToken.length).toBeGreaterThan(0);
    expect(turnstileToken).toContain('turnstile');

    // 3. Solve image text captcha natively
    const imageCode = await captcha.solveImageCaptcha('captcha_code=ABC123');
    expect(imageCode).toBe('ABC123');
  });

  test('Built-in Captcha Adapter interacts with page DOM, injects tokens, and handles sliders @security @captcha', async ({
    page,
    captcha,
  }) => {
    // 1. Set up a page with mock captcha inputs
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="test-form">
            <div id="slider-track" class="slider-track" style="width: 300px; height: 40px; background: #eee; position: relative;">
              <div id="slide_btn" class="slider-button" style="width: 40px; height: 40px; background: #007bff; position: absolute; left: 0; top: 0; cursor: pointer;"></div>
            </div>
            <textarea id="g-recaptcha-response" name="g-recaptcha-response" style="display:none;"></textarea>
            <input type="hidden" name="cf-turnstile-response" />
          </form>
        </body>
      </html>
    `);

    // 2. Solve slider gesture natively using simulated human drag physics
    const sliderSolved = await captcha.solveSlider(page, {
      sliderSelector: '#slide_btn',
      trackSelector: '#slider-track',
    });
    expect(sliderSolved).toBe(true);

    // 3. Inject verified token into reCAPTCHA DOM field
    const injectedRecaptcha = await captcha.injectToken(
      page,
      'recaptcha',
      'verified_token_recaptcha_123',
    );
    expect(injectedRecaptcha).toBe('verified_token_recaptcha_123');

    const domRecaptchaVal = await page.inputValue('#g-recaptcha-response');
    expect(domRecaptchaVal).toBe('verified_token_recaptcha_123');

    // 4. Inject verified token into Cloudflare Turnstile DOM field
    const injectedTurnstile = await captcha.injectToken(
      page,
      'turnstile',
      'verified_token_turnstile_456',
    );
    expect(injectedTurnstile).toBe('verified_token_turnstile_456');

    const domTurnstileVal = await page.inputValue('input[name="cf-turnstile-response"]');
    expect(domTurnstileVal).toBe('verified_token_turnstile_456');
  });

  test('Super-power automation solvers: Aliyun, Arkose, verifySolved, extractConfig & grid snapping @security @captcha', async ({
    page,
    captcha,
  }) => {
    // 1. Verify snapToGrid logic
    const { snapToGrid } = await import('../../src/adapters/captcha/captcha.adapter');
    const rawClicks = [{ x: 50, y: 50 }];
    const snapped = snapToGrid(rawClicks, 300, 200, '3x3');
    expect(snapped.length).toBe(1);
    expect(snapped[0].x).toBe(50); // middle of 100px column
    expect(snapped[0].y).toBeCloseTo(33.33, 1);

    // 2. Mock page with Aliyun & OTP elements
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script>
            window.__aliyunCaptchaConfig = { sceneId: 'test_scene_123', prefix: 'aliyun_prefix' };
            window.__aliyunCaptchaCallbacks = {
              success: function(param) { window.__receivedCaptcha = param; return { code: 0 }; }
            };
          </script>
        </head>
        <body>
          <div id="aliyunCaptcha-window-float" style="width: 320px; height: 180px; position: relative;">
            <div id="aliyunCaptcha-sliding-slider" style="width: 40px; height: 40px; background: red; position: absolute; left: 0;"></div>
            <div class="aliyunCaptcha-sliding-track" style="width: 300px; height: 40px; background: gray;"></div>
          </div>
          <input class="ant-otp-input" placeholder="code" style="display:none;" />
        </body>
      </html>
    `);

    // 3. Extract captcha config
    const extracted = await captcha.extractCaptchaConfig(page);
    expect(extracted.sceneId).toBe('test_scene_123');
    expect(extracted.prefix).toBe('aliyun_prefix');

    // 4. Solve Aliyun slider natively
    const aliyunSolved = await captcha.solveAliyunCaptcha(page, { retries: 1 });
    expect(aliyunSolved).toBeDefined();

    // 5. Inject Aliyun token directly into callbacks
    const injectedAliyun = await captcha.injectToken(page, {
      captchaVerifyParam: 'aliyun_token_verified',
    });
    expect(injectedAliyun).toBe(true);

    const receivedParam = await page.evaluate(() => (window as any).__receivedCaptcha);
    expect(receivedParam).toBeDefined();

    // 6. Test verifySolved and waitForCaptchaSolved
    await page.evaluate(() => {
      const floatWin = document.getElementById('aliyunCaptcha-window-float');
      if (floatWin) floatWin.style.display = 'none';
      const otpInput = document.querySelector('input.ant-otp-input') as HTMLElement;
      if (otpInput) otpInput.style.display = 'block';
    });

    const isSolved = await captcha.verifySolved(page, 2000);
    expect(isSolved).toBe(true);

    const isOtpDetected = await captcha.waitForCaptchaSolved(page, 2000);
    expect(isOtpDetected).toBe(true);
  });
});
