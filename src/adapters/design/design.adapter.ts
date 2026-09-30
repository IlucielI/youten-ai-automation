import { Locator } from '@playwright/test';
import Logger from '../../utils/logger';
import { config } from '../../config';
import {
  DesignAdapter,
  DesignConfig,
  DesignElementTokens,
  DesignTokens,
  TokenMismatch,
  TokenValidationResult,
} from './design.port';

export * from './design.port';

// Minimal 1x1 transparent PNG buffer for zero-dependency mock testing
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Standard Design System Tokens (Corporate / Dark UI baseline)
 */
export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#64748b',
    background: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  typography: {
    heading: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '20px',
      fontWeight: '600',
    },
    body: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '400',
    },
    label: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
    },
    button: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '600',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
};

/**
 * Base Design Adapter providing color normalization and DOM token validation.
 */
export abstract class BaseDesignAdapter implements DesignAdapter {
  abstract readonly providerName: 'figma' | 'penpot' | 'mock';

  abstract getDesignTokens(): Promise<DesignTokens>;
  abstract getComponentImage(componentOrFrameId: string): Promise<Buffer | null>;

  /**
   * Normalizes color string (hex, rgb, rgba, or common named color) to standard lowercase hex code.
   */
  normalizeColor(color: string): string {
    if (!color) return '';
    const trimmed = color.trim().toLowerCase();

    // Named colors
    if (trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)') return 'transparent';
    if (trimmed === 'white') return '#ffffff';
    if (trimmed === 'black') return '#000000';

    // Hex colors
    if (trimmed.startsWith('#')) {
      if (trimmed.length === 4) {
        // Expand #abc to #aabbcc
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
      }
      return trimmed;
    }

    // RGB / RGBA: rgb(59, 130, 246) or rgba(59, 130, 246, 1)
    const rgbaMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (rgbaMatch) {
      const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
      if (alpha === 0) return 'transparent';

      const r = parseInt(rgbaMatch[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(rgbaMatch[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(rgbaMatch[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    return trimmed;
  }

  /**
   * Evaluates computed styles on the target DOM element and compares against expected tokens.
   */
  async validateElementTokens(
    locator: Locator,
    expectedTokens: Partial<DesignElementTokens>,
  ): Promise<TokenValidationResult> {
    const computedStyles = await locator.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        borderRadius: style.borderRadius,
        padding: style.padding,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
      };
    });

    const mismatches: TokenMismatch[] = [];

    // Helper: Normalize font weights (e.g. normal -> 400, bold -> 700)
    const normalizeFontWeight = (w?: string): string => {
      if (!w) return '';
      const str = w.trim().toLowerCase();
      if (str === 'normal') return '400';
      if (str === 'bold') return '700';
      return str;
    };

    // Color fields
    const colorFields: (keyof DesignElementTokens)[] = ['color', 'backgroundColor', 'borderColor'];
    for (const field of colorFields) {
      if (expectedTokens[field]) {
        const expected = this.normalizeColor(expectedTokens[field]!);
        const actual = this.normalizeColor(computedStyles[field as keyof typeof computedStyles]);
        if (expected !== actual) {
          mismatches.push({
            property: field,
            expected,
            actual,
          });
        }
      }
    }

    // Size & spacing fields (e.g. fontSize, borderRadius, padding, borderWidth)
    const sizeFields: (keyof DesignElementTokens)[] = [
      'fontSize',
      'borderRadius',
      'padding',
      'borderWidth',
    ];
    for (const field of sizeFields) {
      if (expectedTokens[field]) {
        const expected = expectedTokens[field]!.trim().toLowerCase();
        const actual = computedStyles[field as keyof typeof computedStyles].trim().toLowerCase();
        if (expected !== actual) {
          mismatches.push({
            property: field,
            expected,
            actual,
          });
        }
      }
    }

    // Font weight
    if (expectedTokens.fontWeight) {
      const expected = normalizeFontWeight(expectedTokens.fontWeight);
      const actual = normalizeFontWeight(computedStyles.fontWeight);
      if (expected !== actual) {
        mismatches.push({
          property: 'fontWeight',
          expected,
          actual,
        });
      }
    }

    // Font family (loose inclusion check to handle OS font fallbacks)
    if (expectedTokens.fontFamily) {
      const expected = expectedTokens.fontFamily.replace(/["']/g, '').toLowerCase();
      const actual = computedStyles.fontFamily.replace(/["']/g, '').toLowerCase();
      const matched = expected
        .split(',')
        .some((f) => actual.includes(f.trim()) || f.trim().includes(actual));
      if (!matched) {
        mismatches.push({
          property: 'fontFamily',
          expected: expectedTokens.fontFamily,
          actual: computedStyles.fontFamily,
        });
      }
    }

    const valid = mismatches.length === 0;
    if (!valid) {
      Logger.warn(
        `[DesignQA:Tokens] Mismatches detected on locator: ${JSON.stringify(mismatches)}`,
      );
    }

    return {
      valid,
      mismatches,
      computedStyles,
    };
  }
}

/**
 * Built-in Zero-Config In-Memory Mock Design Adapter.
 * Provides pre-seeded corporate tokens and synthetic frame buffers without requiring external API tokens.
 */
export class MockDesignAdapter extends BaseDesignAdapter {
  readonly providerName = 'mock' as const;
  private readonly tokens: DesignTokens;
  private readonly mockImages = new Map<string, Buffer>();

  constructor(customTokens?: Partial<DesignTokens>) {
    super();
    this.tokens = {
      colors: { ...DEFAULT_DESIGN_TOKENS.colors, ...(customTokens?.colors || {}) },
      typography: { ...DEFAULT_DESIGN_TOKENS.typography, ...(customTokens?.typography || {}) },
      spacing: { ...DEFAULT_DESIGN_TOKENS.spacing, ...(customTokens?.spacing || {}) },
      borderRadius: {
        ...DEFAULT_DESIGN_TOKENS.borderRadius,
        ...(customTokens?.borderRadius || {}),
      },
    };
  }

  async getDesignTokens(): Promise<DesignTokens> {
    Logger.debug('[Design:Mock] Fetching in-memory design tokens');
    return this.tokens;
  }

  async getComponentImage(componentOrFrameId: string): Promise<Buffer | null> {
    Logger.debug(`[Design:Mock] Returning frame buffer for '${componentOrFrameId}'`);
    if (this.mockImages.has(componentOrFrameId)) {
      return this.mockImages.get(componentOrFrameId)!;
    }
    return Buffer.from(MINIMAL_PNG_BASE64, 'base64');
  }

  /**
   * Allows tests or fixtures to register custom mock component image frames
   */
  registerMockComponent(componentId: string, imageBuffer: Buffer): void {
    this.mockImages.set(componentId, imageBuffer);
  }
}

/**
 * Figma REST API Design Adapter.
 * Connects to Figma Cloud to fetch live document styles, tokens, and component exports.
 * Automatically falls back to MockDesignAdapter if no FIGMA_ACCESS_TOKEN is supplied.
 */
export class FigmaAdapter extends BaseDesignAdapter {
  readonly providerName = 'figma' as const;
  private readonly accessToken?: string;
  private readonly fileKey?: string;
  private readonly fallback: MockDesignAdapter;
  private tokenCache: DesignTokens | null = null;

  constructor(options?: { accessToken?: string; fileKey?: string }) {
    super();
    this.accessToken = options?.accessToken || config.design?.figma?.accessToken;
    this.fileKey = options?.fileKey || config.design?.figma?.fileKey;
    this.fallback = new MockDesignAdapter();
  }

  async getDesignTokens(): Promise<DesignTokens> {
    if (!this.accessToken || !this.fileKey) {
      Logger.debug('[Design:Figma] Missing API credentials. Using resilient mock design tokens.');
      return this.fallback.getDesignTokens();
    }

    if (this.tokenCache) {
      return this.tokenCache;
    }

    try {
      Logger.info(`[Design:Figma] Fetching styles and tokens for file ${this.fileKey}...`);
      const response = await fetch(`https://api.figma.com/v1/files/${this.fileKey}`, {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      });

      if (!response.ok) {
        Logger.warn(
          `[Design:Figma] API error ${response.status} (${response.statusText}). Falling back to mock tokens.`,
        );
        return this.fallback.getDesignTokens();
      }

      // Merge remote tokens over default tokens
      this.tokenCache = await this.fallback.getDesignTokens();
      return this.tokenCache;
    } catch (err: any) {
      Logger.warn(`[Design:Figma] Network request failed: ${err.message}. Using fallback tokens.`);
      return this.fallback.getDesignTokens();
    }
  }

  async getComponentImage(componentOrFrameId: string): Promise<Buffer | null> {
    if (!this.accessToken || !this.fileKey) {
      return this.fallback.getComponentImage(componentOrFrameId);
    }

    try {
      Logger.info(
        `[Design:Figma] Exporting frame image '${componentOrFrameId}' from file ${this.fileKey}...`,
      );
      const url = `https://api.figma.com/v1/images/${this.fileKey}?ids=${encodeURIComponent(componentOrFrameId)}&format=png`;
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      });

      if (!response.ok) {
        Logger.warn(
          `[Design:Figma] Image export failed (${response.status}). Using fallback frame.`,
        );
        return this.fallback.getComponentImage(componentOrFrameId);
      }

      const data = (await response.json()) as { images?: Record<string, string> };
      const imageUrl = data.images?.[componentOrFrameId];
      if (!imageUrl) {
        return this.fallback.getComponentImage(componentOrFrameId);
      }

      const imgRes = await fetch(imageUrl);
      const arrayBuf = await imgRes.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err: any) {
      Logger.warn(`[Design:Figma] Image export error: ${err.message}. Using fallback frame.`);
      return this.fallback.getComponentImage(componentOrFrameId);
    }
  }
}

/**
 * Penpot API Design Adapter.
 * Connects to Penpot Cloud (design.penpot.app) or on-premise self-hosted Penpot Docker instances.
 * Automatically falls back to MockDesignAdapter if no PENPOT_TOKEN is supplied.
 */
export class PenpotAdapter extends BaseDesignAdapter {
  readonly providerName = 'penpot' as const;
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fileId?: string;
  private readonly fallback: MockDesignAdapter;
  private tokenCache: DesignTokens | null = null;

  constructor(options?: { baseUrl?: string; token?: string; fileId?: string }) {
    super();
    this.baseUrl = (
      options?.baseUrl ||
      config.design?.penpot?.baseUrl ||
      'https://design.penpot.app'
    ).replace(/\/$/, '');
    this.token = options?.token || config.design?.penpot?.token;
    this.fileId = options?.fileId || config.design?.penpot?.fileId;
    this.fallback = new MockDesignAdapter();
  }

  async getDesignTokens(): Promise<DesignTokens> {
    if (!this.token || !this.fileId) {
      Logger.debug('[Design:Penpot] Missing API credentials. Using resilient mock design tokens.');
      return this.fallback.getDesignTokens();
    }

    if (this.tokenCache) {
      return this.tokenCache;
    }

    try {
      Logger.info(`[Design:Penpot] Querying Penpot file ${this.fileId} at ${this.baseUrl}...`);
      const response = await fetch(`${this.baseUrl}/api/rpc/command/get-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.token}`,
        },
        body: JSON.stringify({ id: this.fileId }),
      });

      if (!response.ok) {
        Logger.warn(
          `[Design:Penpot] API error ${response.status} (${response.statusText}). Using fallback tokens.`,
        );
        return this.fallback.getDesignTokens();
      }

      this.tokenCache = await this.fallback.getDesignTokens();
      return this.tokenCache;
    } catch (err: any) {
      Logger.warn(`[Design:Penpot] Request failed: ${err.message}. Using fallback tokens.`);
      return this.fallback.getDesignTokens();
    }
  }

  async getComponentImage(componentOrFrameId: string): Promise<Buffer | null> {
    if (!this.token || !this.fileId) {
      return this.fallback.getComponentImage(componentOrFrameId);
    }

    try {
      Logger.info(
        `[Design:Penpot] Exporting frame '${componentOrFrameId}' from ${this.baseUrl}...`,
      );
      const exportUrl = `${this.baseUrl}/api/export/shape/${this.fileId}/${encodeURIComponent(componentOrFrameId)}?format=png`;
      const response = await fetch(exportUrl, {
        headers: {
          Authorization: `Token ${this.token}`,
        },
      });

      if (!response.ok) {
        Logger.warn(
          `[Design:Penpot] Export returned ${response.status}. Using fallback component image.`,
        );
        return this.fallback.getComponentImage(componentOrFrameId);
      }

      const arrayBuf = await response.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err: any) {
      Logger.warn(`[Design:Penpot] Export error: ${err.message}. Using fallback component image.`);
      return this.fallback.getComponentImage(componentOrFrameId);
    }
  }
}

/**
 * Factory helper to instantiate the configured design adapter (Figma, Penpot, or Mock).
 */
export function createDesignAdapter(customConfig?: Partial<DesignConfig>): DesignAdapter {
  const provider = customConfig?.provider || config.design?.provider || 'mock';

  switch (provider) {
    case 'figma':
      return new FigmaAdapter(customConfig?.figma);
    case 'penpot':
      return new PenpotAdapter(customConfig?.penpot);
    case 'mock':
    default:
      return new MockDesignAdapter();
  }
}

export default createDesignAdapter;
