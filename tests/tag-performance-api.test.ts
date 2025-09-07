import { describe, it, expect, vi } from 'vitest';

// Mock session helper to return the seeded user
vi.mock('@/lib/session', () => ({
  getSessionUser: () => ({ id: (globalThis as { __AX_USER_ID?: string }).__AX_USER_ID || 'missing', email: 'user@example.com' }),
  requireSessionUser: () => ({ id: (globalThis as { __AX_USER_ID?: string }).__AX_USER_ID || 'missing', email: 'user@example.com' })
}));
// Mock logger wrapper to bypass next-auth getServerSession/authOptions import chain
vi.mock('@/lib/api/logger-wrapper', () => ({
  withLogging: (h: any) => h, // eslint-disable-line @typescript-eslint/no-explicit-any
  jsonOk: (data: unknown, status = 200, headers: Record<string,string> = {}) => new Response(JSON.stringify({ data, error: null }), { status, headers: { 'Content-Type': 'application/json', ...headers } }),
  jsonError: (error: unknown, status = 400, headers: Record<string,string> = {}) => new Response(JSON.stringify({ data: null, error }), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}));
declare global { var __AX_USER_ID: string | undefined }

// Use spies on the real prisma client to avoid cross-suite leakage
import { prisma } from '@/lib/prisma';
const fakeUserId = 'user_test_1';

describe('tag-performance API (unit, mocked prisma)', () => {
  it('returns aggregated tag performance JSON', async () => {
    const now = Date.now();
    const links = [
      {
        tagId: 'tag1',
        tag: { label: 'Momentum', color: 'token:--color-accent' },
        trade: {
          entryPrice: 100,
          exitPrice: 110,
          quantity: 1,
          direction: 'LONG',
          fees: 0,
          exitAt: new Date(now - 86400000 * 2),
          instrument: { contractMultiplier: 1, currency: 'USD' }
        }
      },
      {
        tagId: 'tag1',
        tag: { label: 'Momentum', color: 'token:--color-accent' },
        trade: {
          entryPrice: 200,
          exitPrice: 190,
          quantity: 1,
          direction: 'SHORT',
          fees: 0,
          exitAt: new Date(now - 86400000),
          instrument: { contractMultiplier: 1, currency: 'USD' }
        }
      }
    ];
  vi.spyOn(prisma.tradeTagOnTrade, 'findMany').mockResolvedValue(links as unknown as ReturnType<typeof prisma.tradeTagOnTrade.findMany> extends Promise<infer T> ? T : never);
  vi.spyOn(prisma.journalSettings, 'findUnique').mockResolvedValue({ userId: fakeUserId, baseCurrency: 'USD' } as unknown as ReturnType<typeof prisma.journalSettings.findUnique> extends Promise<infer T> ? T : never);
    (globalThis as { __AX_USER_ID?: string }).__AX_USER_ID = fakeUserId;
    const { GET: TagPerformanceAPI } = await import('@/app/api/analytics/tag-performance/route');
    const res = await TagPerformanceAPI(new Request('http://localhost/api/analytics/tag-performance'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    const tags = body.data.tags as Array<{ label: string; trades: number; wins: number; losses: number; sumPnl: number; avgPnl: number }>;
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBe(1);
    const t = tags[0];
    expect(t.label).toBe('Momentum');
    expect(t.trades).toBe(2);
    expect(t.wins + t.losses).toBe(2);
    expect(typeof t.sumPnl).toBe('number');
    expect(typeof t.avgPnl).toBe('number');
  });
});
