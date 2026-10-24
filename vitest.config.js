import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'shared/test/**/*.test.js',
      'server/test/**/*.test.js',
      'client/test/**/*.test.js',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
