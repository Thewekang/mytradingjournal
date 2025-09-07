import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load env for tests: prefer .env.test, fallback to .env.local
const envPathTest = path.resolve(__dirname, '.env.test');
const envPathLocal = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPathTest)) {
  dotenv.config({ path: envPathTest });
} else if (fs.existsSync(envPathLocal)) {
  dotenv.config({ path: envPathLocal });
}

// Fallback no-op DATABASE_URL for non-DB unit tests to avoid Prisma init crash; integration tests will skip.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://invalid/skip';
}

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['lib/**/*.test.ts', 'tests/**/*.{test,a11y}.ts?(x)'],
    setupFiles: ['./vitest.setup.ts'],
  restoreMocks: true,
  clearMocks: true,
  mockReset: true,
  isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        'vitest.setup.ts',
        'tests/**',
        'scripts/**',
        'prisma/**'
      ],
      thresholds: ((): { lines: number; statements: number; functions: number; branches: number } => {
        if (process.env.RELAXED_COVERAGE === '1') {
          return { lines: 75, statements: 75, functions: 75, branches: 65 };
        }
        return { lines: 85, statements: 85, functions: 85, branches: 75 };
      })()
    }
  },
  resolve: {
    alias: ((): Record<string, string> => {
      const aliases: Record<string, string> = {
        '@': path.resolve(__dirname, './')
      };
      if (process.env.FOCUS_TEST === '1') {
        // Stub Prisma client in focus runs to avoid native engine on Windows
        aliases['@prisma/client'] = path.resolve(__dirname, './tests/mocks/prisma-client.ts');
      }
      return aliases;
    })()
  }
});
