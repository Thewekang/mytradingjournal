import { describe, it, expect, vi, beforeEach } from 'vitest';

// Bypass next-auth/prisma by stubbing the logger wrapper to a pass-through.
vi.mock('@/lib/api/logger-wrapper', () => ({
  withLogging: (h: unknown) => h
}));

// Helper to import the route fresh after env/mocks are set
async function loadRoute() {
  const mod: typeof import('@/app/api/dashboard/export/pdf/route') = await import('@/app/api/dashboard/export/pdf/route');
  return mod;
}

describe('Experimental PDF Export Route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env.ENABLE_PDF_EXPORT;
  });

  it('returns 501 when feature flag is disabled', async () => {
    const { GET } = await loadRoute();
    const req = new Request('http://localhost/api/dashboard/export/pdf');
  const handler = GET as unknown as (r: Request) => Promise<Response>;
  const res = await handler(req);
    expect(res.status).toBe(501);
    const text = await res.text();
    expect(text.toLowerCase()).toContain('disabled');
  });

  it('returns 200 with mocked Playwright when feature flag is enabled', async () => {
    process.env.ENABLE_PDF_EXPORT = '1';
    // Mock playwright to avoid launching a real browser
    vi.doMock('playwright', () => ({
      chromium: {
        launch: async () => ({
          newPage: async () => ({
            goto: async () => {},
            addStyleTag: async () => {},
            pdf: async () => new Uint8Array([37, 80, 68, 70, 45]) // %PDF-
          }),
          close: async () => {}
        })
      }
    }));

  const { GET } = await loadRoute();
  const req = new Request('http://localhost/api/dashboard/export/pdf');
  const handler = GET as unknown as (r: Request) => Promise<Response>;
  const res = await handler(req);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('application/pdf');
  const buf = new Uint8Array(await res.arrayBuffer());
  expect(buf.byteLength).toBeGreaterThan(0);
  });
});
