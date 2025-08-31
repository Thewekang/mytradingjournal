import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTrade, RiskError } from '@/lib/services/trade-service';

async function seed() {
  const user = await prisma.user.create({ data: { email: `riskblock-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, riskPerTradePct: 0.5, initialEquity: 100000 } });
  const inst = await prisma.instrument.create({ data: { symbol: `RB${Date.now()}`, name: 'RiskBlock', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  return { user, inst };
}

describe('Per-trade risk blocking [db]', () => {
  it('throws RiskError when risk exceeds limit', async () => {
    const { user, inst } = await seed();
    const input: any = { instrumentId: inst.id, direction: 'LONG', entryPrice: 1000, quantity: 100, entryAt: new Date().toISOString() };
    let threw = false;
    try {
      await createTrade(user.id, input);
    } catch (e: any) {
      threw = true;
      expect(e).toBeInstanceOf(RiskError);
      expect(e.limit).toBe(0.5);
    }
    expect(threw).toBe(true);
  });
});
