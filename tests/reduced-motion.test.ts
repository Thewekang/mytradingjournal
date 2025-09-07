import { test, expect } from 'vitest';

// Lightweight unit-style test invoking the reduced-motion audit logic via dynamic import of the script in a mocked context is complex.
// Instead, this acts as a placeholder to ensure script presence; CI should invoke the script directly in audit pipeline.
// Future: integrate Playwright-driven audit under a separate runner.

test('reduced motion audit script exists', async () => {
  const fs = await import('node:fs/promises');
  const path = 'scripts/reduced-motion-audit.mjs';
  const stat = await fs.stat(path);
  expect(stat.isFile()).toBe(true);
});
