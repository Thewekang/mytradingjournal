import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { rebuildDailyEquity } from '@/lib/services/daily-equity-service';
import { GET as equityRangeGet } from '@/app/api/equity/range/route';

// Mock next-auth session
vi.mock('next-auth', () => ({
  getServerSession: () => Promise.resolve({ user: { id: globalThis.__testUserId } })
}));
vi.mock('next-auth/next', () => ({
  getServerSession: () => Promise.resolve({ user: { id: globalThis.__testUserId } })
}));

async function seedUserWithTrades(){
  const user = await prisma.user.create({ data: { email: `equity-api-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, initialEquity: 100000 } });
  const inst = await prisma.instrument.create({ data: { symbol: 'EQAPI-'+Date.now(), name: 'EQ API', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  const now = new Date();
  const dayOffsets = [3,2,1];
  for(const off of dayOffsets){
    const exitAt = new Date(now.getTime() - off*24*3600*1000);
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 100 + off, quantity: 1, status: 'CLOSED', entryAt: new Date(exitAt.getTime()-3600*1000), exitAt, fees: 0 } });
  }
  return user.id;
}

// augment global for test session id used in auth mock
declare global { var __testUserId: string | undefined; }

describe('Equity range API', () => {
  let userId: string;
  beforeAll(async () => {
    userId = await seedUserWithTrades();
    // expose to mocked getServerSession
    globalThis.__testUserId = userId;
    await rebuildDailyEquity(userId);
  });

  it('returns aggregated equity rows (direct model path)', async () => {
    const url = 'https://example.test/api/equity/range';
  const res = await equityRangeGet(new Request(url));
  const json = await res.json() as { data: Array<{ date: string }> };
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(3);
    // ascending order check
  const dates = json.data.map(r => r.date);
    expect(dates.slice().sort()).toEqual(dates);
  });

  // Fallback behavior removed; dynamic raw path no longer supported.

  it('applies from/to filtering', async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 2*24*3600*1000).toISOString().slice(0,10);
    const to = new Date(now.getTime() - 1*24*3600*1000).toISOString().slice(0,10);
    const url = `https://example.test/api/equity/range?from=${from}&to=${to}`;
    const res = await equityRangeGet(new Request(url));
  const json = await res.json() as { data: Array<{ date: string }> };
    expect(json.data.length).toBeLessThan(3);
    for(const r of json.data){
      const d = r.date.slice(0,10);
      expect(d >= from && d <= to).toBe(true);
    }
  });
});
