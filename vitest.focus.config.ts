import { defineConfig } from 'vitest/config';
import path from 'path';

// Focus-only config: limited UI tests with prisma stub alias.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'tests/focus-visibility-walk.test.tsx',
      'tests/dialog-close-focus.test.tsx',
      'tests/derive-audit-pages.test.ts',
      'tests/form-error-summary.test.tsx'
    ],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@prisma/client': path.resolve(__dirname, 'tests/__mocks__/prisma-client-stub.ts')
    }
  }
});
