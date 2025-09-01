import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTrade, computePerTradeRiskPct, RiskError } from '@/lib/services/trade-service';

async function seed() {
  const user = await prisma.user.create({ data: { email: `riskwarn-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, riskPerTradePct: 0.5, initialEquity: 100000 } });
  const inst = await prisma.instrument.create({ data: { symbol: `RW${Date.now()}`, name: 'RiskWarn', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  return { user, inst };
}

describe('Per-trade risk evaluation [db]', () => {
  it('computes risk pct and detects when above limit', async () => {
    const { user, inst } = await seed();
    const tradeInput = { instrumentId: inst.id, direction: 'LONG' as const, entryPrice: 1000, quantity: 100, entryAt: new Date().toISOString(), fees: 0 };
    let evalResult = null;
    try {
  const trade = await createTrade(user.id, tradeInput);
      evalResult = await computePerTradeRiskPct(user.id, { entryPrice: trade.entryPrice, quantity: trade.quantity, instrumentId: trade.instrumentId });
    } catch (e) {
      // If blocked, still compute evaluation directly from intended input
      if (e instanceof RiskError) {
        evalResult = await computePerTradeRiskPct(user.id, { entryPrice: tradeInput.entryPrice, quantity: tradeInput.quantity, instrumentId: tradeInput.instrumentId });
      } else {
        throw e;
      }
    }
    expect(evalResult).not.toBeNull();
    if (evalResult) {
      expect(evalResult.riskPct).toBeGreaterThan(evalResult.limit);
    }
  });
});
