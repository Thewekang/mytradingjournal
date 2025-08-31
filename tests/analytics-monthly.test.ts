import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('monthly analytics aggregation (service-level approximation)', () => {
  it('aggregates closed trades per month', async () => {
    const user = await prisma.user.create({ data: { email: `monthly-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await prisma.instrument.create({ data: { symbol: `MTH${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const now = new Date();
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 10, 12));
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5, 14));
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 1, entryAt: prevMonth, exitAt: new Date(prevMonth.getTime()+3600000), fees: 1, status: 'CLOSED' } });
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 50, exitPrice: 40, quantity: 1, entryAt: thisMonth, exitAt: new Date(thisMonth.getTime()+3600000), fees: 0, status: 'CLOSED' } });
    const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null } });
    const monthly: Record<string, number> = {};
    for (const t of trades) {
      if (!t.exitAt) continue;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees });
      if (pnl == null) continue;
      const key = t.exitAt.toISOString().slice(0,7);
      monthly[key] = (monthly[key] || 0) + pnl;
    }
    expect(Object.keys(monthly).length).toBe(2);
    // LONG trade: (110-100)*1 -1 = 9 ; SHORT: (50-40)*1 -0 =10; ensure values present
    const vals = Object.values(monthly).map(v=>+v.toFixed(2));
    expect(vals.includes(9)).toBe(true);
    expect(vals.includes(10)).toBe(true);
  });
});
