import * as crypto from 'crypto';
import Logger from '../../utils/logger';

export interface TotpAdapter {
  generate(secret: string): string;
  verify(token: string, secret: string, window?: number): boolean;
  getRemainingSeconds(): number;
}

/**
 * TotpAdapter implements standard RFC 6238 Time-based One-Time Passwords (TOTP).
 * Generates 6-digit 2FA codes identical to Google Authenticator, Microsoft Authenticator, and Authy.
 * Built with zero external dependencies using Node.js built-in crypto.
 */
export class StandardTotpAdapter implements TotpAdapter {
  private readonly digits: number;
  private readonly stepSeconds: number;

  constructor(digits: number = 6, stepSeconds: number = 30) {
    this.digits = digits;
    this.stepSeconds = stepSeconds;
  }

  /**
   * Decodes a Base32 string (commonly used for 2FA secrets) into a Buffer
   */
  private base32Decode(base32: string): Buffer {
    const clean = base32.replace(/[\s=-]/g, '').toUpperCase();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < clean.length; i++) {
      const idx = alphabet.indexOf(clean[i]);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generates the current 6-digit TOTP code for a given base32 secret
   */
  generate(secret: string): string {
    const key = this.base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / this.stepSeconds);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = (code % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');
    Logger.step(`[TOTP 2FA] Generated ${this.digits}-digit code: ${otp}`);
    return otp;
  }

  /**
   * Verifies if a given token is valid within the allowed time window (default: +/- 1 step)
   */
  verify(token: string, secret: string, window: number = 1): boolean {
    const key = this.base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(epoch / this.stepSeconds);

    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i;
      const counterBuffer = Buffer.alloc(8);
      counterBuffer.writeBigInt64BE(BigInt(counter));

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(counterBuffer);
      const digest = hmac.digest();

      const offset = digest[digest.length - 1] & 0x0f;
      const code =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

      const expectedOtp = (code % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');
      if (token === expectedOtp) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns remaining seconds before the current TOTP token expires
   */
  getRemainingSeconds(): number {
    const epoch = Math.floor(Date.now() / 1000);
    return this.stepSeconds - (epoch % this.stepSeconds);
  }
}

export default StandardTotpAdapter;
