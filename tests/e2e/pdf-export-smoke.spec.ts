import { test, expect } from '@playwright/test';

// Smoke test: the PDF endpoint should respond either with 200 (enabled) or 501 (disabled)
// We don't assert on content bytes; this is just a routing/flag smoke.

test('pdf endpoint responds behind feature flag', async ({ request, baseURL }) => {
  const url = new URL('/api/dashboard/export/pdf?from=2025-01-01&to=2025-01-31&tagId=abc&tagId=def', baseURL);
  const res = await request.get(url.toString());
  expect([200, 501]).toContain(res.status());
  if (res.status() === 200) {
    // Should be a PDF content-type when enabled
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('application/pdf');
  }
});
