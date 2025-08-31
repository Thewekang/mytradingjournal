import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('tag performance analytics', () => {
  it('aggregates pnl per tag', async () => {
    const user = await prisma.user.create({ data: { email: `tagperf-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await prisma.instrument.create({ data: { symbol: `TP${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const tagA = await prisma.tradeTag.create({ data: { label: 'Setup:A', color: '#10b981', userId: user.id } });
    const tagB = await prisma.tradeTag.create({ data: { label: 'Emotion:FOMO', color: '#f59e0b', userId: user.id } });
    const base = new Date();
    const t1 = await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 1, entryAt: base, exitAt: new Date(base.getTime()+1000), fees: 0, status: 'CLOSED' } });
    await prisma.tradeTagOnTrade.create({ data: { tradeId: t1.id, tagId: tagA.id } });
    const t2 = await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 50, exitPrice: 55, quantity: 1, entryAt: base, exitAt: new Date(base.getTime()+2000), fees: 0, status: 'CLOSED' } });
    await prisma.tradeTagOnTrade.create({ data: { tradeId: t2.id, tagId: tagA.id } });
    await prisma.tradeTagOnTrade.create({ data: { tradeId: t2.id, tagId: tagB.id } });
    const links = await prisma.tradeTagOnTrade.findMany({ where: { trade: { userId: user.id, status: 'CLOSED', deletedAt: null } }, include: { tag: true, trade: true } });
    let tagASum = 0; let tagACount = 0;
    for (const l of links) {
      if (l.tagId === tagA.id) {
        const t = l.trade;
        const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees }) || 0;
        tagASum += pnl; tagACount++;
      }
    }
    expect(tagACount).toBe(2);
    expect(tagASum).toBe(5);
  });
});
