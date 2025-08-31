import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('daily analytics aggregation (service-level approximation)', () => {
  it('aggregates closed trades per day', async () => {
    const user = await prisma.user.create({ data: { email: `daily-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await prisma.instrument.create({ data: { symbol: `DLY${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const base = new Date();
    // create three closed trades across two days
    const day1 = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()-1, 10));
    const day2 = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 12));
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 105, quantity: 1, entryAt: day1, exitAt: new Date(day1.getTime()+3600000), fees: 1, status: 'CLOSED' } });
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 200, exitPrice: 190, quantity: 2, entryAt: day1, exitAt: new Date(day1.getTime()+7200000), fees: 2, status: 'CLOSED' } });
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 50, exitPrice: 45, quantity: 1, entryAt: day2, exitAt: new Date(day2.getTime()+3600000), fees: 0.5, status: 'CLOSED' } });
    const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null }, orderBy: { exitAt: 'asc' } });
    const daily: Record<string, number> = {};
    for (const t of trades) {
      if (!t.exitAt) continue;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees });
      if (pnl == null) continue;
      const key = t.exitAt.toISOString().slice(0,10);
      daily[key] = (daily[key] || 0) + pnl;
    }
    const entries = Object.entries(daily);
    expect(entries.length).toBe(2);
    // verify numerical sum rough correctness (LONG: (105-100)*1 -1 =4; SHORT: (200-190)*2 -2 =18; total day1=22)
    const day1Key = trades[0].exitAt!.toISOString().slice(0,10);
    expect(+daily[day1Key].toFixed(2)).toBe(22);
  });
});
