import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { recalcGoalsForUser } from '@/lib/services/goal-service';

async function seedTrades(userId: string, instrumentId: string) {
  // Create three consecutive profitable days
  for (let i=0;i<3;i++) {
    const entryAt = new Date(Date.now() - (i*86400000) + 1000);
    const exitAt = new Date(entryAt.getTime() + 60*60*1000);
    await prisma.trade.create({ data: { userId, instrumentId, direction: 'LONG', entryPrice: 100, exitPrice: 101 + i, quantity: 1, entryAt, exitAt, status: 'CLOSED', fees: 0 } });
  }
}

describe('Daily Green Streak Goal', () => {
  it('computes current streak and marks achieved when target met', async () => {
    const user = await prisma.user.create({ data: { email: `streak-${Date.now()}@ex.com`, passwordHash: 'x' } });
    await prisma.journalSettings.create({ data: { userId: user.id, initialEquity: 100000, riskPerTradePct: 1, maxDailyLossPct: 3, maxConsecutiveLossesThreshold: 5, timezone: 'UTC' } });
  const inst = await prisma.instrument.create({ data: { symbol: `STREAK${Date.now()}`, name: 'Streak', category: 'Equity', currency: 'USD', tickSize: 0.01, contractMultiplier: 1 } });
    const start = new Date(); start.setDate(start.getDate()-5);
    const end = new Date(); end.setDate(end.getDate()+5);
    const goal = await prisma.goal.create({ data: { userId: user.id, type: 'DAILY_GREEN_STREAK', period: 'MONTH', targetValue: 2, currentValue: 0, startDate: start, endDate: end } });
    await seedTrades(user.id, inst.id);
    await recalcGoalsForUser(user.id);
    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    expect(updated?.currentValue).toBeGreaterThanOrEqual(2);
    expect(updated?.achievedAt).not.toBeNull();
  }, 10000);
});
