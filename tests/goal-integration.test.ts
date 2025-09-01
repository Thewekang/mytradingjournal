import { describe, it, expect } from 'vitest';
import { recalcGoalsForUser } from '@/lib/services/goal-service';
import { prisma } from '@/lib/prisma';

// NOTE: This test assumes a real database connection defined by env vars.
// It creates a user + instrument + trades then verifies goal progress updates.

async function setupUser() {
  const user = await prisma.user.create({ data: { email: `test-${Date.now()}@example.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const instrument = await prisma.instrument.create({ data: { symbol: `SYM${Date.now()}`, name: 'Test Instrument', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 10 } });
  return { user, instrument };
}

describe('Goal integration [db]', () => {
  it('updates TOTAL_PNL and TRADE_COUNT and WIN_RATE goals after trades', async () => {
    const { user, instrument } = await setupUser();
  const start = new Date(Date.now() - 24*3600*1000); // start yesterday to avoid timezone edge
  const end = new Date(Date.now() + 7*24*3600*1000);
    await prisma.goal.createMany({ data: [
      { userId: user.id, type: 'TOTAL_PNL', period: 'MONTH', targetValue: 500, currentValue: 0, startDate: start, endDate: end },
      { userId: user.id, type: 'TRADE_COUNT', period: 'MONTH', targetValue: 5, currentValue: 0, startDate: start, endDate: end },
      { userId: user.id, type: 'WIN_RATE', period: 'MONTH', targetValue: 60, currentValue: 0, startDate: start, endDate: end }
    ] });
    // create two trades: one win, one loss
    const nowIso = new Date().toISOString();
  await prisma.trade.create({ data: { userId: user.id, instrumentId: instrument.id, direction: 'LONG', entryPrice: 100, exitPrice: 115, quantity: 1, entryAt: nowIso, exitAt: nowIso, fees: 0, status: 'CLOSED' } }); // +15 * 10 = +150
  await prisma.trade.create({ data: { userId: user.id, instrumentId: instrument.id, direction: 'SHORT', entryPrice: 200, exitPrice: 210, quantity: 1, entryAt: nowIso, exitAt: nowIso, fees: 0, status: 'CLOSED' } }); // -10 * 10 = -100
    // Recalc
    await recalcGoalsForUser(user.id);
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });
  type GoalRec = typeof goals[number];
  const pnlGoal = goals.find((g: GoalRec) => g.type === 'TOTAL_PNL');
  const countGoal = goals.find((g: GoalRec) => g.type === 'TRADE_COUNT');
  const winRateGoal = goals.find((g: GoalRec) => g.type === 'WIN_RATE');
    expect(pnlGoal?.currentValue).toBeGreaterThan(0); // first trade win * multiplier
    expect(countGoal?.currentValue).toBe(2);
    expect(winRateGoal?.currentValue).toBe(50); // 1 of 2 wins => 50%
  });
});
