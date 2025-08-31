import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { evaluateRiskForUser } from '@/lib/services/risk-service';

async function seedUserWithSettings() {
  const user = await prisma.user.create({ data: { email: `risk-${Date.now()}@example.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, maxDailyLossPct: 0.01 } }); // tiny limit to trigger breach
  const inst = await prisma.instrument.create({ data: { symbol: `RISK${Date.now()}`, name: 'Risk Instrument', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  return { user, inst };
}

describe('Risk breach logging [db]', () => {
  it('creates DAILY_LOSS breach when P/L exceeds limit', async () => {
    const { user, inst } = await seedUserWithSettings();
    const nowIso = new Date().toISOString();
    // Single large losing trade to exceed limit (loss 200 on 100k base => 0.2% > 0.01%)
    await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 98, quantity: 100, entryAt: nowIso, exitAt: nowIso, status: 'CLOSED', fees: 0 } });
    const breaches = await evaluateRiskForUser(user.id);
    expect(breaches.some(b => b.type === 'DAILY_LOSS')).toBe(true);
    const persisted = await prisma.riskBreachLog.findMany({ where: { userId: user.id } });
    expect(persisted.length).toBeGreaterThan(0);
  });
});
