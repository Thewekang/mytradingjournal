import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { recalcGoalsForUser } from '@/lib/services/goal-service';

async function setupUserWithTrades() {
  const user = await prisma.user.create({ data: { email: `gt-${Date.now()}@example.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const instrument = await prisma.instrument.create({ data: { symbol: `GX${Date.now()}`, name: 'GX', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  const nowIso = new Date().toISOString();
  // 3 closed trades: +100, +50, -40 => grossProfit=150, grossLoss=40 => PF=3.75, avgWin=75, avgLoss=40
  await prisma.trade.create({ data: { userId: user.id, instrumentId: instrument.id, direction: 'LONG', entryPrice: 100, exitPrice: 200, quantity: 1, entryAt: nowIso, exitAt: nowIso, status: 'CLOSED', fees: 0 } }); // +100
  await prisma.trade.create({ data: { userId: user.id, instrumentId: instrument.id, direction: 'LONG', entryPrice: 50, exitPrice: 100, quantity: 1, entryAt: nowIso, exitAt: nowIso, status: 'CLOSED', fees: 0 } }); // +50
  await prisma.trade.create({ data: { userId: user.id, instrumentId: instrument.id, direction: 'LONG', entryPrice: 80, exitPrice: 40, quantity: 1, entryAt: nowIso, exitAt: nowIso, status: 'CLOSED', fees: 0 } }); // -40
  return { user };
}

describe('New goal types recalculation', () => {
  it('updates PROFIT_FACTOR, EXPECTANCY, AVG_LOSS_CAP', async () => {
    const { user } = await setupUserWithTrades();
    const start = new Date(Date.now() - 24*3600*1000); // yesterday
    const end = new Date(Date.now() + 7*24*3600*1000);
    await prisma.goal.createMany({ data: [
      { userId: user.id, type: 'PROFIT_FACTOR', period: 'MONTH', targetValue: 2, currentValue: 0, startDate: start, endDate: end },
      { userId: user.id, type: 'EXPECTANCY', period: 'MONTH', targetValue: 20, currentValue: 0, startDate: start, endDate: end },
      { userId: user.id, type: 'AVG_LOSS_CAP', period: 'MONTH', targetValue: 50, currentValue: 0, startDate: start, endDate: end }
    ] });
    await recalcGoalsForUser(user.id);
    // Poll (in case future debounce introduced) up to 3s
    let goals = await prisma.goal.findMany({ where: { userId: user.id } });
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) {
      if (goals.every(g=>g.currentValue && g.currentValue > 0)) break;
      await new Promise(r=>setTimeout(r,100));
      goals = await prisma.goal.findMany({ where: { userId: user.id } });
    }
  type GoalRec = typeof goals[number];
  const pf = goals.find((g: GoalRec)=>g.type==='PROFIT_FACTOR');
  const exp = goals.find((g: GoalRec)=>g.type==='EXPECTANCY');
  const lossCap = goals.find((g: GoalRec)=>g.type==='AVG_LOSS_CAP');
    // profit factor = 150 / 40 = 3.75
    expect(pf?.currentValue).toBeGreaterThan(3.7);
    // expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss)
    // winRate=2/3≈0.6667 avgWin=75 avgLoss=40 -> 0.6667*75 - 0.3333*40 ≈ 50 - 13.333 ≈ 36.67
    expect(exp?.currentValue).toBeGreaterThan(30);
    // avg loss = 40, target 50 => should be achieved and <= target
    expect(lossCap?.currentValue).toBeLessThanOrEqual(50);
  }, 10000);
});
