import { Locator } from '@playwright/test';

export interface DesignTypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
}

export interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, DesignTypographyToken>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}

export interface DesignElementTokens {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  borderRadius?: string;
  padding?: string;
  borderColor?: string;
  borderWidth?: string;
}

export interface TokenMismatch {
  property: string;
  expected: string;
  actual: string;
}

export interface TokenValidationResult {
  valid: boolean;
  mismatches: TokenMismatch[];
  computedStyles: Record<string, string>;
}

export interface VisualDiffOptions {
  maxDiffPixelRatio?: number;
  threshold?: number;
}

export interface VisualDiffResult {
  matches: boolean;
  diffPixelRatio?: number;
  message?: string;
}

export interface DesignConfig {
  provider: 'figma' | 'penpot' | 'mock';
  figma: {
    accessToken?: string;
    fileKey?: string;
  };
  penpot: {
    baseUrl?: string;
    token?: string;
    fileId?: string;
  };
}

export interface DesignAdapter {
  readonly providerName: 'figma' | 'penpot' | 'mock';

  /**
   * Fetches design tokens (colors, typography, spacing, border radii) from the design provider.
   */
  getDesignTokens(): Promise<DesignTokens>;

  /**
   * Fetches an exported component or artboard image (PNG Buffer) from Figma/Penpot or mock cache.
   */
  getComponentImage(componentOrFrameId: string): Promise<Buffer | null>;

  /**
   * Validates that an active DOM element adheres to expected design tokens via computed styles.
   */
  validateElementTokens(
    locator: Locator,
    expectedTokens: Partial<DesignElementTokens>,
  ): Promise<TokenValidationResult>;

  /**
   * Normalizes color string (hex, rgb, rgba, named colors) to standard lowercase hex code.
   */
  normalizeColor(color: string): string;
}
