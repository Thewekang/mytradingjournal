import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { evaluateRiskForUser } from '@/lib/services/risk-service';

async function seedUser(threshold: number) {
  const user = await prisma.user.create({ data: { email: `streak-${Date.now()}@example.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, maxConsecutiveLossesThreshold: threshold, initialEquity: 50000 } });
  const inst = await prisma.instrument.create({ data: { symbol: `STK${Date.now()}`, name: 'Test', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  return { user, inst };
}

describe('Configurable loss streak threshold [db]', () => {
  it('logs breach when loss streak >= configured threshold', async () => {
    const { user, inst } = await seedUser(2); // low threshold for test
    const now = new Date().toISOString();
    // Two losing trades to hit threshold
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 90, quantity: 1, entryAt: now, exitAt: now, status: 'CLOSED' } });
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 50, exitPrice: 40, quantity: 1, entryAt: now, exitAt: now, status: 'CLOSED' } });
    const breaches = await evaluateRiskForUser(user.id);
    const streakBreach = breaches.find(b => b.type === 'MAX_CONSECUTIVE_LOSSES');
    expect(streakBreach).toBeTruthy();
    expect(streakBreach?.limit).toBe(2);
  });
});
