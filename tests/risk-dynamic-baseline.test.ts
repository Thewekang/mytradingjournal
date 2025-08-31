import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { evaluateRiskForUser } from '@/lib/services/risk-service';

async function seedWithHistory() {
  const user = await prisma.user.create({ data: { email: `dyn-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, maxDailyLossPct: 1, initialEquity: 100000 } });
  const inst = await prisma.instrument.create({ data: { symbol: `DY${Date.now()}`, name: 'Dyn', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  // Create historical profitable trades (yesterday) to increase baseline
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 10, entryAt: yesterday, exitAt: yesterday, status: 'CLOSED' } }); // +1000
  await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 200, exitPrice: 190, quantity: 10, entryAt: yesterday, exitAt: yesterday, status: 'CLOSED' } }); // +1000 (SHORT profit)
  return { user, inst };
}

describe('Dynamic equity baseline [db]', () => {
  it('raises daily loss % threshold baseline with historical PnL', async () => {
    const { user, inst } = await seedWithHistory();
    const now = new Date().toISOString();
    // Today create a losing trade -1000
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 90, quantity: 10, entryAt: now, exitAt: now, status: 'CLOSED' } });
    const breaches = await evaluateRiskForUser(user.id);
    // Loss 1000 vs equity baseline 102000 (100k + 2k hist) ~0.98% < 1% so no DAILY_LOSS breach
    const dailyLoss = breaches.find(b => b.type === 'DAILY_LOSS');
    expect(dailyLoss).toBeUndefined();
  });
});
