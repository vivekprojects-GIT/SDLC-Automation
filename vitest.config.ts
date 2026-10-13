import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@sdlc/core': path.resolve(__dirname, 'packages/core/src/index.ts') },
  },
  test: {
    include: ['packages/**/test/**/*.test.ts'],
  },
});
