import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import playwrightPlugin from 'eslint-plugin-playwright';

export default [
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'screenshots/**',
      'dist/**'
    ]
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      playwright: playwrightPlugin
    },
    rules: {
      // TypeScript Clean Code Rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',

      // Playwright Specific Clean Code Rules
      'playwright/no-wait-for-timeout': 'error', // Prevents flaky hardcoded sleep in tests
      'playwright/no-element-handle': 'error',   // Enforces modern Locators over legacy ElementHandle
      'playwright/valid-expect': 'error',        // Ensures assertions are always awaited
      'playwright/no-force-option': 'warn',      // Discourages bypassing actionability checks with force
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['expect', '*.expect*'] }]
    }
  }
];
