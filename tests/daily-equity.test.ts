import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { rebuildDailyEquity, rebuildDailyEquityFromDate } from '@/lib/services/daily-equity-service';

async function seedUser(){
  const u = await prisma.user.create({ data: { email: `equity-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: u.id, initialEquity: 50000 } });
  const inst = await prisma.instrument.create({ data: { symbol: 'EQTEST-'+Date.now(), name: 'EQ Test', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  // Two closed trades different days
  const now = new Date();
  const day1 = new Date(now.getTime() - 2*24*3600*1000);
  const day2 = new Date(now.getTime() - 1*24*3600*1000);
  await prisma.trade.create({ data: { userId: u.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 105, quantity: 1, status: 'CLOSED', entryAt: new Date(day1.getTime()-3600*1000), exitAt: day1, fees: 0 } });
  await prisma.trade.create({ data: { userId: u.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 200, exitPrice: 190, quantity: 2, status: 'CLOSED', entryAt: new Date(day2.getTime()-3600*1000), exitAt: day2, fees: 0 } });
  return { u, inst, day1, day2 };
}

describe('DailyEquity service', () => {
  let userId: string;
  beforeAll(async () => {
    const { u } = await seedUser();
    userId = u.id;
  });

  it('rebuilds daily equity and computes cumulative', async () => {
    const rows = await rebuildDailyEquity(userId);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const last = rows[rows.length-1];
    expect(last.cumulativeEquity).toBeGreaterThan(50000);
  });

  it('incrementally rebuilds from trade exit date', async () => {
    const inst = await prisma.instrument.findFirst();
    const exit = new Date();
    await prisma.trade.create({ data: { userId, instrumentId: inst!.id, direction: 'LONG', entryPrice: 50, exitPrice: 60, quantity: 1, status: 'CLOSED', entryAt: new Date(exit.getTime()-3600000), exitAt: exit, fees: 0 } });
    const rows = await rebuildDailyEquityFromDate(userId, exit);
    const last = rows[rows.length-1];
    expect(last.tradeCount).toBeGreaterThan(0);
  });
});
