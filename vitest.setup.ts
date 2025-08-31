import { beforeEach } from 'vitest';

// Skip integration tests gracefully if real DB not configured
const missingRealDb = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('invalid/skip');

// Patch test context global flag
(globalThis as any).__SKIP_DB__ = missingRealDb;

beforeEach(function(ctx) {
  if (missingRealDb) {
    // Convention: test title contains [db] for integration tests
    if (ctx.task.name.includes('[db]')) ctx.skip();
  }
});
