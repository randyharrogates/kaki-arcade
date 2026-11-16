import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.claude/**',
      '**/.wrangler/**',
      'assets/**',
      'docs/**',
      'playwright-report/**',
      'spikes/**',
      'test-results/**',
      'uat/evidence/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // TypeScript reports undefined names itself, for .ts and for the type-checked .mjs tools.
      'no-undef': 'off',
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    // Command-line tools talk to the terminal.
    files: ['tools/**/*.{mjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },
);
