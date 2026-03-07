import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@ddp/shared-types': resolve(__dirname, 'packages/shared-types/src/index.ts'),
      '@ddp/shared-rules': resolve(__dirname, 'packages/shared-rules/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
