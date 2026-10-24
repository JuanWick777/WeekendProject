import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.scratch/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['client/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      '*.config.js',
      'client/vite.config.js',
      'server/**/*.js',
      'scripts/**/*.js',
      'tests/**/*.js',
    ],
    languageOptions: { globals: globals.node },
  },
];
