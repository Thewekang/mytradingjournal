import { describe, it, expect, vi, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: (globalThis as any).__TEST_STREAM_USER_ID, email: 'stream@test.local' } }) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

import { GET as STREAM } from '@/app/api/exports/stream/route';

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

declare global { var __TEST_STREAM_USER_ID: string | undefined }

async function seedUserWithTrades(n = 40){
  const user = await prisma.user.create({ data: { email: `stream-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const instrument = await prisma.instrument.create({ data: { symbol: `TEST-${Date.now()}`, name: 'Test Instrument', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  const now = Date.now();
  const rows = Array.from({ length: n }).map((_, i) => ({
    userId: user.id,
    instrumentId: instrument.id,
    direction: 'LONG' as const,
    entryPrice: 100 + i,
    exitPrice: 101 + i,
    quantity: 1,
    status: 'CLOSED' as const,
    entryAt: new Date(now - (n - i) * 60000),
    exitAt: new Date(now - (n - i - 1) * 60000),
    fees: 0
  }));
  // createMany for speed
  await prisma.trade.createMany({ data: rows });
  return user;
}

describe('direct streaming export', () => {
  beforeAll(async () => {
    const u = await seedUserWithTrades(60);
    (globalThis as any).__TEST_STREAM_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
  }, 20000);

  it('returns CSV inline when below threshold and no forceStream', async () => {
    const res = await (STREAM as unknown as (req: Request) => Promise<Response>)(makeReq('http://localhost/api/exports/stream?type=trades&limit=5'));
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toContain('id');
    expect(lines.length).toBeGreaterThan(1);
    expect(text).not.toContain('# streamed_rows=');
  });

  it('streams when forceStream=1', async () => {
    const res = await (STREAM as unknown as (req: Request) => Promise<Response>)(makeReq('http://localhost/api/exports/stream?type=trades&limit=20&forceStream=1'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('# streamed_rows=');
    const footer = text.trim().split('\n').pop();
    expect(footer?.startsWith('# streamed_rows='));
  });
});
