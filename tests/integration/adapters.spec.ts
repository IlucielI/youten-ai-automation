import { test, expect } from '../../src/fixtures';

test.describe('Backend & QA Adapters Integration (DB, LLM, Redis, Mail, S3, Proxy, Design)', () => {
  test('Target Database Adapter can execute queries and manage connection @adapter @db', async ({
    targetDb,
  }) => {
    // 1. Execute query via adapter
    const result = await targetDb.query('SELECT 1 as is_active, NOW() as current_time');

    // 2. Verify query structure
    expect(result).toBeDefined();
    expect(Array.isArray(result.rows)).toBe(true);
  });

  test('LLM Adapter can generate responses and evaluate criteria as a Judge @adapter @llm', async ({
    llm,
  }) => {
    test.setTimeout(60000);
    // 1. Test basic completion
    const reply = await llm.prompt('What is 2 + 2? Return only the number 4.');
    expect(reply).toContain('4');

    // 2. Test LLM-as-a-Judge evaluation
    const evaluation = await llm.judge({
      userQuery: 'How do I submit a health insurance claim?',
      botResponse:
        'To submit a claim, complete the online claim form in the customer portal and upload your original medical receipts and attending physician statement.',
      expectedCriteria:
        'The response must guide the customer to complete the claim form and attach necessary medical receipts or documentation.',
    });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(7);
  });

  test('Dual Redis Architecture: Separates Automation Runner state from Target SUT business state @adapter @redis', async ({
    automationRedis,
    targetRedis,
  }) => {
    // 1. Target SUT Redis: Simulates target application backend storing user OTP
    const userPhone = '+6281299887766';
    const otpCode = '951753';
    await targetRedis.set(`otp:${userPhone}`, otpCode, 60);

    const retrievedOtp = await targetRedis.getOtp(userPhone);
    expect(retrievedOtp).toBe(otpCode);

    // Verify key isolation: Target SUT key does NOT pollute Automation Runner Redis
    const existsInAutomation = await automationRedis.exists(`otp:${userPhone}`);
    expect(existsInAutomation).toBe(false);

    // 2. Automation Runner Redis: Caches auth bearer token for test session reuse
    const runnerAuthSession = {
      bearerToken: 'eyJh...mock-jwt-token',
      role: 'superadmin',
      cachedAt: Date.now(),
    };
    await automationRedis.setSession('runner_admin', runnerAuthSession, 3600);
    const cachedSession =
      await automationRedis.getSession<typeof runnerAuthSession>('runner_admin');
    expect(cachedSession?.bearerToken).toBe('eyJh...mock-jwt-token');

    // Verify key isolation: Runner session is NOT written to Target SUT Redis
    const existsInTarget = await targetRedis.exists('session:runner_admin');
    expect(existsInTarget).toBe(false);

    // 3. Rate limit reset on Target SUT Redis
    await targetRedis.set(`ratelimit:${userPhone}`, '5');
    await targetRedis.clearRateLimit(userPhone);
    expect(await targetRedis.exists(`ratelimit:${userPhone}`)).toBe(false);

    // 4. Session cleanup on Automation Redis
    const invalidated = await automationRedis.invalidateSession('runner_admin');
    expect(invalidated).toBe(true);
    expect(await automationRedis.getSession('runner_admin')).toBeNull();
  });

  test('Mail / SMTP Adapter can capture emails, extract OTP, and parse verification links @adapter @mail', async ({
    mail,
  }) => {
    const applicantEmail = 'john.doe@example.com';

    // 1. Simulate application/backend sending confirmation email via SMTP
    await mail.simulateIncomingEmail({
      to: [{ address: applicantEmail, name: 'John Doe' }],
      subject: '[CONFIRMATION] Activate Your Insurance Policy',
      text: 'Hello John, thank you for applying. Your OTP code is: 739102. Or click the following link to activate: https://insurance.example.com/activate?token=sec_token_99182',
      html: '<p>Hello John, thank you for applying.</p><p>Your OTP code is: <strong>739102</strong></p><a href="https://insurance.example.com/activate?token=sec_token_99182">Activate Policy</a>',
    });

    // 2. Automated test waits and receives the email
    const email = await mail.waitForEmail(applicantEmail, {
      filterSubject: 'Activate Your Insurance Policy',
    });
    expect(email).toBeDefined();
    expect(email.subject).toContain('Activate Your Insurance Policy');

    // 3. Extract OTP directly from email body
    const otp = mail.extractOtp(email, 6);
    expect(otp).toBe('739102');

    // 4. Extract activation URL
    const activationLink = mail.extractVerificationLink(email);
    expect(activationLink).toBe('https://insurance.example.com/activate?token=sec_token_99182');

    // 5. Clean up inbox
    await mail.clearInbox();
    expect(await mail.getLatestEmail(applicantEmail)).toBeNull();
  });

  test('Target S3 Storage Adapter can upload, verify, presign, and delete files @adapter @s3', async ({
    targetS3,
  }) => {
    const fileKey = 'claims/receipt_test_001.pdf';
    const mockContent = 'PDF-MOCK-CONTENT-STREAM-DATA-12345';

    // 1. Upload document / receipt to Target S3
    const uploadUri = await targetS3.uploadFile(fileKey, mockContent, 'application/pdf');
    expect(uploadUri).toContain(fileKey);

    // 2. Verify file exists in Target S3
    const exists = await targetS3.checkFileExists(fileKey);
    expect(exists).toBe(true);

    // 3. Download and verify content integrity
    const downloadedContent = await targetS3.downloadFileAsString(fileKey);
    expect(downloadedContent).toBe(mockContent);

    // 4. Generate pre-signed download URL
    const presignedUrl = await targetS3.getSignedDownloadUrl(fileKey, 300);
    expect(presignedUrl).toContain(fileKey);

    // 5. Delete document and confirm removal
    const deleted = await targetS3.deleteFile(fileKey);
    expect(deleted).toBe(true);
    expect(await targetS3.checkFileExists(fileKey)).toBe(false);
  });

  test('Proxy Adapter parses formats, masks credentials, rotates pool, and identifies errors @adapter @proxy', async ({
    proxyAdapter,
  }) => {
    // 1. Multi-format parsing (standard URL, raw colon format, simple host:port)
    const parsedHttp = proxyAdapter.parseProxy('http://admin:secret123@192.168.1.100:8080');
    expect(parsedHttp).toEqual({
      server: 'http://192.168.1.100:8080',
      username: 'admin',
      password: 'secret123',
    });

    const parsedRaw = proxyAdapter.parseProxy('10.0.0.50:9090:myuser:mypass');
    expect(parsedRaw).toEqual({
      server: 'http://10.0.0.50:9090',
      username: 'myuser',
      password: 'mypass',
    });

    const parsedSimple = proxyAdapter.parseProxy('10.0.0.50:9090');
    expect(parsedSimple).toEqual({
      server: 'http://10.0.0.50:9090',
    });

    // 2. Safe credential masking
    const masked = proxyAdapter.maskProxy('http://sensitiveUser:sensitivePass@192.168.1.100:8080');
    expect(masked).toBe('http://se***:***@192.168.1.100:8080');
    expect(masked).not.toContain('sensitiveUser');
    expect(masked).not.toContain('sensitivePass');

    // 3. Proxy error identification (self-healing)
    expect(proxyAdapter.isProxyError(new Error('net::ERR_PROXY_CONNECTION_FAILED'))).toBe(true);
    expect(proxyAdapter.isProxyError(new Error('net::ERR_TUNNEL_CONNECTION_FAILED'))).toBe(true);
    expect(proxyAdapter.isProxyError(new Error('407 Proxy Authentication Required'))).toBe(true);
    expect(proxyAdapter.isProxyError(new Error('Unrelated element not found error'))).toBe(false);

    // 4. Custom pool with rotation and dead proxy blacklisting
    const { StandardProxyAdapter } = await import('../../src/adapters/proxy/proxy.adapter');
    const customPool = new StandardProxyAdapter({
      proxyList: ['http://node1:8080', 'http://node2:8080', 'http://node3:8080'],
      strategy: 'round-robin',
    });

    expect(customPool.getPoolStatus().total).toBe(3);
    expect(customPool.selectProxy()?.server).toBe('http://node1:8080');

    // Rotate to next
    const next = customPool.rotateProxy();
    expect(next?.server).toBe('http://node2:8080');

    // Mark node2 dead
    customPool.markProxyDead('http://node2:8080', 'ERR_TUNNEL_FAILED');
    expect(customPool.getPoolStatus().dead).toBe(1);
    expect(customPool.getPoolStatus().active).toBe(2);

    // Rotates only among healthy nodes
    const afterDead = customPool.rotateProxy();
    expect(afterDead?.server).toBe('http://node3:8080');
  });

  test('Design QA Adapter provides design tokens, color normalization, and fallback resilience @adapter @design', async ({
    designAdapter,
  }) => {
    // 1. Verify design tokens retrieval
    const tokens = await designAdapter.getDesignTokens();
    expect(tokens).toBeDefined();
    expect(tokens.colors.primary).toBe('#3b82f6');
    expect(tokens.colors.card).toBe('#1e293b');
    expect(tokens.borderRadius.md).toBe('8px');
    expect(tokens.typography.button.fontSize).toBe('14px');

    // 2. Verify color normalization (hex shorthand, rgb, rgba, named colors)
    expect(designAdapter.normalizeColor('#fff')).toBe('#ffffff');
    expect(designAdapter.normalizeColor('rgb(59, 130, 246)')).toBe('#3b82f6');
    expect(designAdapter.normalizeColor('rgba(59, 130, 246, 1)')).toBe('#3b82f6');
    expect(designAdapter.normalizeColor('rgba(0, 0, 0, 0)')).toBe('transparent');
    expect(designAdapter.normalizeColor('white')).toBe('#ffffff');
    expect(designAdapter.normalizeColor('black')).toBe('#000000');

    // 3. Verify component image fetching (returns valid PNG buffer)
    const imageBuffer = await designAdapter.getComponentImage('auth-card');
    expect(imageBuffer).toBeDefined();
    expect(Buffer.isBuffer(imageBuffer)).toBe(true);
    expect(imageBuffer!.length).toBeGreaterThan(0);

    // 4. Verify Figma and Penpot adapters fallback gracefully when unconfigured
    const { FigmaAdapter, PenpotAdapter } =
      await import('../../src/adapters/design/design.adapter');
    const unconfiguredFigma = new FigmaAdapter();
    const figmaTokens = await unconfiguredFigma.getDesignTokens();
    expect(figmaTokens.colors.primary).toBe('#3b82f6');

    const unconfiguredPenpot = new PenpotAdapter();
    const penpotTokens = await unconfiguredPenpot.getDesignTokens();
    expect(penpotTokens.colors.primary).toBe('#3b82f6');
  });

  test('Design QA Adapter can audit and validate live DOM element tokens @adapter @design', async ({
    page,
    designAdapter,
  }) => {
    // Render a test element
    await page.setContent(`
      <button id="cta-button" style="background-color: #3b82f6; color: #ffffff; border-radius: 8px; font-size: 14px; font-weight: 600; padding: 12px 24px; border: 1px solid #2563eb;">
        Get Started
      </button>
    `);

    const ctaButton = page.locator('#cta-button');

    // 1. Positive case: Valid tokens match computed DOM styles
    const validResult = await designAdapter.validateElementTokens(ctaButton, {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
    });
    expect(validResult.valid).toBe(true);
    expect(validResult.mismatches).toHaveLength(0);

    // 2. Negative case: Detect intentional color/size mismatch
    const invalidResult = await designAdapter.validateElementTokens(ctaButton, {
      backgroundColor: '#ef4444', // Expected red, but actual is blue
      borderRadius: '16px', // Expected 16px, actual is 8px
    });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.mismatches.length).toBeGreaterThanOrEqual(2);
    expect(invalidResult.mismatches.some((m) => m.property === 'backgroundColor')).toBe(true);
    expect(invalidResult.mismatches.some((m) => m.property === 'borderRadius')).toBe(true);
  });
});
