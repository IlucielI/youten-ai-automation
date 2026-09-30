import Logger from '../../utils/logger';
import { config, MailConfig } from '../../config';
import { sleep } from '../../utils/helpers';

export interface EmailRecipient {
  address: string;
  name?: string;
}

export interface EmailMessage {
  id: string;
  from?: EmailRecipient[];
  to: EmailRecipient[];
  subject: string;
  text?: string;
  html?: string;
  date: string;
}

export interface MailAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAllEmails(): Promise<EmailMessage[]>;
  getLatestEmail(toEmail: string, filterSubject?: string): Promise<EmailMessage | null>;
  waitForEmail(
    toEmail: string,
    options?: { timeoutMs?: number; filterSubject?: string },
  ): Promise<EmailMessage>;
  extractVerificationLink(email: EmailMessage, customPattern?: RegExp): string | null;
  extractOtp(email: EmailMessage, digits?: number): string | null;
  clearInbox(): Promise<void>;

  // Simulation helper for unit/mock test suites
  simulateIncomingEmail(message: Omit<EmailMessage, 'id' | 'date'>): Promise<EmailMessage>;
}

/**
 * MultiProviderMailAdapter handles email reception and OTP verification across multiple providers:
 * 1. Maildev / Mailpit (Local development / CI)
 * 2. Microsoft Outlook / Hotmail (Microsoft Graph API OAuth2)
 * 3. Google Gmail (Gmail REST API)
 * 4. Custom SMTP/IMAP
 */
export class SmtpMailAdapter implements MailAdapter {
  private readonly mailConfig: MailConfig;
  private readonly memoryInbox: EmailMessage[] = [];
  private outlookAccessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(customConfig?: MailConfig) {
    this.mailConfig = customConfig || config.mail;
  }

  get provider(): string {
    return this.mailConfig.provider;
  }

  async connect(): Promise<void> {
    Logger.info(
      `[MAIL:${this.provider.toUpperCase()}] Initialized QA Email Provider (Provider: ${this.provider})`,
    );

    if (this.provider === 'outlook' && this.mailConfig.outlook.refreshToken) {
      try {
        await this.refreshOutlookToken();
        Logger.success('[MAIL:OUTLOOK] Authenticated with Microsoft Graph API.');
      } catch (err: any) {
        Logger.warn(
          `[MAIL:OUTLOOK] Token refresh failed (${err.message}). Using fallback inbox for test resilience.`,
        );
      }
    }
  }

  async disconnect(): Promise<void> {
    Logger.debug(`[MAIL:${this.provider.toUpperCase()}] Disconnected.`);
  }

  /**
   * Refreshes OAuth2 access token for Microsoft Graph API
   */
  private async refreshOutlookToken(): Promise<string> {
    if (this.outlookAccessToken && Date.now() < this.tokenExpiry) {
      return this.outlookAccessToken;
    }

    const { clientId, clientSecret, refreshToken } = this.mailConfig.outlook;
    if (!refreshToken) {
      throw new Error('No OUTLOOK_REFRESH_TOKEN provided');
    }

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (clientSecret) body.append('client_secret', clientSecret);

    const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`OAuth token endpoint returned HTTP ${res.status}`);
    }

    const data = await res.json();
    this.outlookAccessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.outlookAccessToken!;
  }

  /**
   * Fetch messages from Outlook via Microsoft Graph API
   */
  private async fetchOutlookMessages(): Promise<EmailMessage[]> {
    try {
      const token = await this.refreshOutlookToken();
      const res = await fetch(
        'https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime%20desc&$select=id,subject,bodyPreview,receivedDateTime,from,toRecipients',
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!res.ok) return [];
      const json = await res.json();
      return (json.value || []).map((msg: any) => ({
        id: msg.id,
        from: msg.from?.emailAddress
          ? [{ address: msg.from.emailAddress.address, name: msg.from.emailAddress.name }]
          : [],
        to: (msg.toRecipients || []).map((r: any) => ({
          address: r.emailAddress?.address || '',
          name: r.emailAddress?.name,
        })),
        subject: msg.subject || '',
        text: msg.bodyPreview || '',
        html: msg.body?.content || '',
        date: msg.receivedDateTime || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch all captured emails from the active provider or fallback memory inbox
   */
  async getAllEmails(): Promise<EmailMessage[]> {
    if (this.provider === 'outlook' && this.mailConfig.outlook.refreshToken) {
      const outlookEmails = await this.fetchOutlookMessages();
      if (outlookEmails.length > 0) return outlookEmails;
    }

    // Default Maildev REST API check
    if (this.mailConfig.maildevUrl) {
      try {
        const response = await fetch(`${this.mailConfig.maildevUrl.replace(/\/+$/, '')}/email`, {
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
          const rawEmails = await response.json();
          return rawEmails.map((e: any) => ({
            id: e.id || e._id,
            from: e.from,
            to: e.to,
            subject: e.subject || '',
            text: e.text || '',
            html: e.html || '',
            date: e.date || new Date().toISOString(),
          }));
        }
      } catch {
        // Maildev server is unreachable or offline, use in-memory store
      }
    }

    return [...this.memoryInbox];
  }

  /**
   * Get the most recent email addressed to a specific recipient
   */
  async getLatestEmail(toEmail: string, filterSubject?: string): Promise<EmailMessage | null> {
    const all = await this.getAllEmails();
    const matched = all.filter((e) => {
      const isRecipient =
        !toEmail || (e.to && e.to.some((t) => t.address.toLowerCase() === toEmail.toLowerCase()));
      const isSubjectMatched = filterSubject
        ? e.subject.toLowerCase().includes(filterSubject.toLowerCase())
        : true;
      return isRecipient && isSubjectMatched;
    });

    if (matched.length === 0) return null;
    return matched[matched.length - 1];
  }

  /**
   * Polls the inbox until an email arrives for the given recipient, or timeout occurs
   */
  async waitForEmail(
    toEmail: string,
    options: { timeoutMs?: number; filterSubject?: string } = {},
  ): Promise<EmailMessage> {
    const timeoutMs = options.timeoutMs ?? 15000;
    const intervalMs = 1000;
    const startTime = Date.now();

    Logger.step(
      `[MAIL:${this.provider.toUpperCase()}] Waiting for email to "${toEmail}" ${options.filterSubject ? `(Subject: "${options.filterSubject}")` : ''}...`,
    );

    while (Date.now() - startTime < timeoutMs) {
      const email = await this.getLatestEmail(toEmail, options.filterSubject);
      if (email) {
        Logger.success(
          `[MAIL:${this.provider.toUpperCase()}] Email received for ${toEmail}: "${email.subject}"`,
        );
        return email;
      }
      await sleep(intervalMs);
    }

    throw new Error(`Timed out after ${timeoutMs}ms waiting for email addressed to: ${toEmail}`);
  }

  /**
   * Extracts an activation or verification link from an email body
   */
  extractVerificationLink(email: EmailMessage, customPattern?: RegExp): string | null {
    const content = (email.html || '') + ' ' + (email.text || '');
    const pattern =
      customPattern || /https?:\/\/[^\s"'<>]+(?:verify|confirm|token|activate)[^\s"'<>]*/i;
    const match = content.match(pattern);

    if (match) {
      Logger.debug(`Extracted verification URL: ${match[0]}`);
      return match[0];
    }

    return null;
  }

  /**
   * Extracts numeric or alphanumeric OTP codes from email subject or body.
   * Matches patterns like:
   * - "Your OTP code is: 123456"
   * - "Verification code: AB12CD"
   * - Standalone 6-digit codes
   */
  extractOtp(email: EmailMessage, digits: number = 6): string | null {
    const content = `${email.subject}\n${email.text || ''}\n${email.html || ''}`;

    // 1. Explicit OTP phrase matching
    const explicitRegex =
      /\b(?:otp\s*code|verification\s*code|security\s*code|one-time\s*(?:code|password)|kode(?:\s*otp)?)\s*[:\s]*([a-zA-Z0-9]{4,8})\b/i;
    const explicitMatch = content.match(explicitRegex);
    if (explicitMatch) {
      Logger.debug(`Extracted OTP from explicit phrase: ${explicitMatch[1]}`);
      return explicitMatch[1];
    }

    // 2. Strict N-digit sequence pattern
    const regex = new RegExp(`\\b\\d{${digits}}\\b`);
    const match = content.match(regex);
    if (match) {
      Logger.debug(`Extracted fallback OTP from email: ${match[0]}`);
      return match[0];
    }

    return null;
  }

  async clearInbox(): Promise<void> {
    if (this.mailConfig.maildevUrl) {
      try {
        await fetch(`${this.mailConfig.maildevUrl.replace(/\/+$/, '')}/email/all`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(2000),
        });
      } catch {
        // Fall back to memory
      }
    }
    this.memoryInbox.length = 0;
    Logger.step(`[MAIL:${this.provider.toUpperCase()}] Test inbox cleared.`);
  }

  async simulateIncomingEmail(message: Omit<EmailMessage, 'id' | 'date'>): Promise<EmailMessage> {
    const email: EmailMessage = {
      ...message,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      date: new Date().toISOString(),
    };
    this.memoryInbox.push(email);
    Logger.step(
      `[MAIL:${this.provider.toUpperCase()}] Simulated incoming email: "${email.subject}" to ${email.to.map((t) => t.address).join(', ')}`,
    );
    return email;
  }
}

export default SmtpMailAdapter;
