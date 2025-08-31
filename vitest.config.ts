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
    environment: 'node',
    globals: true,
  include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
  setupFiles: ['./vitest.setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
