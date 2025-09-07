import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
type TradeLite = { id: string; userId: string; instrumentId: string | null; entryAt: Date; exitAt: Date | null };
import { GET } from '@/app/api/cron/backup-verify/route';

describe('cron backup-verify endpoint', () => {
  beforeAll(() => {
    process.env.CRON_SECRET = 'secret';
  });

  it('returns summary when authorized with x-cron-secret', async () => {
  vi.spyOn(prisma.user, 'count').mockResolvedValue(1 as unknown as ReturnType<typeof prisma.user.count> extends Promise<infer T> ? T : never);
  vi.spyOn(prisma.trade, 'count').mockResolvedValue(2 as unknown as ReturnType<typeof prisma.trade.count> extends Promise<infer T> ? T : never);
    vi.spyOn(prisma.trade, 'findMany').mockResolvedValue([
      { id: 't1', userId: 'u1', instrumentId: null, entryAt: new Date('2025-01-01T00:00:00Z'), exitAt: null } as TradeLite
    ] as unknown as ReturnType<typeof prisma.trade.findMany> extends Promise<infer T> ? T : never);
  vi.spyOn(prisma.exportJob, 'count').mockResolvedValue(3 as unknown as ReturnType<typeof prisma.exportJob.count> extends Promise<infer T> ? T : never);
  vi.spyOn(prisma.dailyEquity, 'count').mockResolvedValue(4 as unknown as ReturnType<typeof prisma.dailyEquity.count> extends Promise<infer T> ? T : never);
    const req = new Request('http://localhost/api/cron/backup-verify', { headers: { 'x-cron-secret': 'secret' } });
  const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('no-rid');
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.counts).toEqual({ users: 1, trades: 2, exports: 3, equity: 4 });
    expect(Array.isArray(body.data.recentTrades)).toBe(true);
    expect(body.data.recentTrades[0]).toMatchObject({ id: 't1', userId: 'u1', instrumentId: null });
    expect(typeof body.data.elapsedMs).toBe('number');
  });

  it('rejects when unauthorized', async () => {
    const req = new Request('http://localhost/api/cron/backup-verify');
  const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });
});
