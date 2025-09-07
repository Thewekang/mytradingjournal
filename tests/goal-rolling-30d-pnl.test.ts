import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { recalcGoalsForUser } from '@/lib/services/goal-service';

describe('Rolling 30D PnL Goal', () => {
  it('aggregates only last 30 days closed trades', { timeout: 10000 }, async () => {
    const user = await prisma.user.create({ data: { email: `roll30-${Date.now()}@ex.com`, passwordHash: 'x' } });
    await prisma.journalSettings.create({ data: { userId: user.id } });
    const inst = await prisma.instrument.create({ data: { symbol: `R30${Date.now()}`, name: 'R30', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
    const now = new Date();
    const oldDay = new Date(now.getTime() - 40*86400000);
    // old trade (should NOT count)
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 120, quantity: 1, entryAt: oldDay, exitAt: oldDay, status: 'CLOSED', fees: 0 } });
    // recent trades (count)
    for (let i=0;i<3;i++) {
      const d = new Date(now.getTime() - i*5*86400000); // every 5 days
      await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 110 + i, quantity: 1, entryAt: d, exitAt: d, status: 'CLOSED', fees: 0 } });
    }
    const start = new Date(now.getTime() - 10*86400000);
    const end = new Date(now.getTime() + 10*86400000);
    const goal = await prisma.goal.create({ data: { userId: user.id, type: 'ROLLING_30D_PNL', period: 'MONTH', targetValue: 10, currentValue: 0, startDate: start, endDate: end } });
    await recalcGoalsForUser(user.id);
    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    expect(updated?.currentValue).toBeGreaterThan(0);
    // Ensure old trade excluded: max possible if all 3 recent ~ (10 + 11 + 12) = 33
    expect((updated?.currentValue||0)).toBeLessThan(50);
  });
});
