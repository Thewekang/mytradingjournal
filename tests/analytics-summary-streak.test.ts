import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('summary streak metrics', () => {
  it('derives current and max consecutive losses', async () => {
    const user = await prisma.user.create({ data: { email: `streak-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await prisma.instrument.create({ data: { symbol: `ST${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const base = new Date();
    const seq = [ { e:100,x:95 }, { e:100,x:90 }, { e:50,x:70 }, { e:30,x:27 }, { e:40,x:38 }, { e:20,x:19 } ];
    let t = 0;
    for (const s of seq) {
      await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: s.e, exitPrice: s.x, quantity: 1, entryAt: new Date(base.getTime()+t), exitAt: new Date(base.getTime()+t+1000), fees: 0, status: 'CLOSED' } });
      t += 2000;
    }
    const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null }, orderBy: { exitAt: 'asc' } });
    let current = 0, max = 0;
    for (const tr of trades) {
      const pnl = computeRealizedPnl({ entryPrice: tr.entryPrice, exitPrice: tr.exitPrice ?? undefined, quantity: tr.quantity, direction: tr.direction, fees: tr.fees }) || 0;
      if (pnl < 0) { current++; if (current>max) max = current; } else { current = 0; }
    }
    expect(max).toBe(3);
    expect(current).toBe(3);
  }, 20000);
});
