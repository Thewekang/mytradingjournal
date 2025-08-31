import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('distribution analytics (service-level approximation)', () => {
  it('counts wins, losses, breakeven', async () => {
    const user = await prisma.user.create({ data: { email: `dist-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await prisma.instrument.create({ data: { symbol: `DST${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const base = new Date();
    // Win
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 105, quantity: 1, entryAt: base, exitAt: new Date(base.getTime()+1000), fees: 0, status: 'CLOSED' } });
    // Loss
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 50, exitPrice: 55, quantity: 1, entryAt: base, exitAt: new Date(base.getTime()+2000), fees: 0, status: 'CLOSED' } });
    // Breakeven (after fees effectively zero) -> use exact same entry/exit and zero fees
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 200, exitPrice: 200, quantity: 1, entryAt: base, exitAt: new Date(base.getTime()+3000), fees: 0, status: 'CLOSED' } });
    const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null } });
    let wins=0, losses=0, breakeven=0; const pnls:number[]=[];
    for (const t of trades) {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees });
      if (pnl == null) continue;
      pnls.push(pnl);
      if (Math.abs(pnl) < 1e-8) breakeven++; else if (pnl > 0) wins++; else losses++;
    }
    expect(wins).toBe(1);
    expect(losses).toBe(1);
    expect(breakeven).toBe(1);
    const winRate = pnls.length ? wins / pnls.length : 0;
    expect(+winRate.toFixed(2)).toBe(0.33);
  });
});
