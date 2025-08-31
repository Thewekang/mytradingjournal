import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

// Simple drawdown calculation replication
describe('drawdown analytics (service-level)', () => {
  it('computes max drawdown from sequence', async () => {
    const user = await prisma.user.create({ data: { email: `dd-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await prisma.instrument.create({ data: { symbol: `DD${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const base = new Date();
    // Sequence of P/L: +100, -50, -80 (total -30 from peak 100), +40
    const tradesData = [
      { entry:100, exit:200, qty:1 }, // +100
      { entry:200, exit:150, qty:1 }, // -50
      { entry:150, exit:70, qty:1 },  // -80 (cumulative equity now -30, drawdown from 100 peak is 130)
      { entry:70, exit:110, qty:1 }   // +40
    ];
    let entryAt = base.getTime();
    for (const td of tradesData) {
      await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: td.entry, exitPrice: td.exit, quantity: td.qty, entryAt: new Date(entryAt), exitAt: new Date(entryAt + 1000), fees: 0, status: 'CLOSED' } });
      entryAt += 2000;
    }
    const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null }, orderBy: { exitAt: 'asc' } });
    let equity = 0, peak = 0, maxDD = 0;
    for (const t of trades) {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees }) || 0;
      equity += pnl;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
    }
    // Expected max drawdown: after third trade equity = 100 -50 -80 = -30; peak was 100 so drawdown = 130
    expect(maxDD).toBe(130);
  });
});
