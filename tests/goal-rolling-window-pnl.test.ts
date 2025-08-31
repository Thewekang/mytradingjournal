import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { recalcGoalsForUser } from '@/lib/services/goal-service';

async function seedUser() {
  const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const user = await prisma.user.create({ data: { email: `rwin-${nonce}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const inst = await prisma.instrument.create({ data: { symbol: `RW${nonce}`.toUpperCase(), name: 'RW', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  return { user, inst };
}

function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }

describe('ROLLING_WINDOW_PNL Goal', () => {
  it('aggregates only trades within custom window (7 days)', async () => {
    const { user, inst } = await seedUser();
    // Trades: 10d ago (+50) should be excluded, 6d ago (+40) included, today (+30) included.
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 150, quantity: 1, entryAt: daysAgo(10), exitAt: daysAgo(10), status: 'CLOSED', fees: 0 } }); // +50
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 140, quantity: 1, entryAt: daysAgo(6), exitAt: daysAgo(6), status: 'CLOSED', fees: 0 } }); // +40
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 200, exitPrice: 230, quantity: 1, entryAt: daysAgo(0), exitAt: daysAgo(0), status: 'CLOSED', fees: 0 } }); // +30
    const start = daysAgo(30); const end = daysAgo(-1); // active window covers now
    const goal = await prisma.goal.create({ data: { userId: user.id, type: 'ROLLING_WINDOW_PNL', windowDays: 7, period: 'MONTH', targetValue: 1000, currentValue: 0, startDate: start, endDate: end } });
    await recalcGoalsForUser(user.id);
    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    // Expected PnL: 40 + 30 = 70
    expect(updated?.currentValue).toBeGreaterThan(65);
    expect(updated?.currentValue).toBeLessThan(75);
  });

  it('edge window 1 day only counts today trades', async () => {
    const { user, inst } = await seedUser();
    // Trades: yesterday (+25) should be excluded for 1-day window, today (+10) included
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 125, quantity: 1, entryAt: daysAgo(1), exitAt: daysAgo(1), status: 'CLOSED', fees: 0 } }); // +25
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 50, exitPrice: 60, quantity: 1, entryAt: daysAgo(0), exitAt: daysAgo(0), status: 'CLOSED', fees: 0 } }); // +10
    const start = daysAgo(2); const end = daysAgo(-1);
    const goal = await prisma.goal.create({ data: { userId: user.id, type: 'ROLLING_WINDOW_PNL', windowDays: 1, period: 'MONTH', targetValue: 1000, currentValue: 0, startDate: start, endDate: end } });
    await recalcGoalsForUser(user.id);
    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    // Only today's +10 should count
    expect(updated?.currentValue).toBeGreaterThan(9);
    expect(updated?.currentValue).toBeLessThan(11);
  });
});
