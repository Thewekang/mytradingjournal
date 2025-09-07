/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// These services are called after creation; stub to no-op (kept local and harmless)
vi.mock('@/lib/analytics-cache', () => ({ invalidateAnalyticsCache: vi.fn() }));
vi.mock('@/lib/services/goal-service', () => ({ recalcGoalsForTradeMutation: vi.fn() }));
vi.mock('@/lib/services/risk-service', () => ({ scheduleRiskEvaluation: vi.fn() }));
vi.mock('@/lib/services/daily-equity-service', () => ({ rebuildDailyEquityFromDate: vi.fn() }));

import { prisma } from '@/lib/prisma';
import { createTrade, RiskError } from '@/lib/services/trade-service';
import type { TradeCreateInput } from '@/lib/validation/trade';

describe('trade risk enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks when per-trade risk exceeds JournalSettings limit', async () => {
  vi.spyOn(prisma.journalSettings, 'findUnique').mockResolvedValue({
      userId: 'u1',
      initialEquity: 100000,
      riskPerTradePct: 1,
    } as any);
  vi.spyOn(prisma.instrument, 'findUnique').mockResolvedValue({ contractMultiplier: 1, symbol: 'ES' } as any);
  vi.spyOn(prisma.propEvaluation, 'findFirst').mockResolvedValue(null);

    const input: TradeCreateInput = {
      instrumentId: 'inst1',
      direction: 'LONG',
      entryPrice: 2000, // notional = 2000 * 100 = 200,000 => 200% of 100,000
      quantity: 100,
      entryAt: new Date().toISOString(),
      fees: 0,
    };

    await expect(createTrade('u1', input)).rejects.toBeInstanceOf(RiskError);
  // No DB writes
  const txSpy = vi.spyOn(prisma, '$transaction');
  expect(txSpy).not.toHaveBeenCalled();
  });

  it('blocks against stricter prop evaluation cap (maxSingleTradeRisk)', async () => {
  vi.spyOn(prisma.journalSettings, 'findUnique').mockResolvedValue({
      userId: 'u1',
      initialEquity: 100000,
      riskPerTradePct: 2,
    } as any);
  vi.spyOn(prisma.instrument, 'findUnique').mockResolvedValue({ contractMultiplier: 1, symbol: 'ES' } as any);
    // Prop cap at 0.5%
  vi.spyOn(prisma.propEvaluation, 'findFirst').mockResolvedValue({ maxSingleTradeRisk: 0.5 } as any);

    const input: TradeCreateInput = {
      instrumentId: 'inst1',
      direction: 'LONG',
      entryPrice: 1000, // notional = 1000 * 100 = 100,000 => 100% -> too high; make it smaller to exceed 0.5% but under 2%
      quantity: 1,      // 1000 notional => 1% risk
      entryAt: new Date().toISOString(),
      fees: 0,
    };

    await expect(createTrade('u1', input)).rejects.toBeInstanceOf(RiskError);
  const txSpy2 = vi.spyOn(prisma, '$transaction');
  expect(txSpy2).not.toHaveBeenCalled();
  });

  it('creates trade when within both limits', async () => {
  vi.spyOn(prisma.journalSettings, 'findUnique').mockResolvedValue({
      userId: 'u1',
      initialEquity: 100000,
      riskPerTradePct: 1,
    } as any);
  vi.spyOn(prisma.instrument, 'findUnique').mockResolvedValue({ contractMultiplier: 1, symbol: 'ES' } as any);
  vi.spyOn(prisma.propEvaluation, 'findFirst').mockResolvedValue({ maxSingleTradeRisk: 0.8 } as any);

    // Risk ≈ 0.3%
    const input: TradeCreateInput = {
      instrumentId: 'inst1',
      direction: 'LONG',
      entryPrice: 150,
      quantity: 2, // notional 300 => 0.3%
      entryAt: new Date().toISOString(),
      fees: 0,
    };

  // $transaction calls the callback and returns its result
  vi.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      const tx = {
        trade: {
          create: vi.fn().mockResolvedValue({
            id: 't1', userId: 'u1', instrumentId: input.instrumentId,
            direction: input.direction, entryPrice: input.entryPrice,
            quantity: input.quantity, leverage: null, entryAt: new Date(input.entryAt),
            fees: input.fees ?? 0, notes: null, reason: null, lesson: null,
            status: 'OPEN', createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
            exitPrice: null, exitAt: null,
            instrument: { contractMultiplier: 1 },
          }),
        },
        tradeTagOnTrade: { createMany: vi.fn() },
      };
      return await fn(tx);
    });

    const res = await createTrade('u1', input);
    expect(res).toMatchObject({ id: 't1', userId: 'u1', instrumentId: 'inst1', status: 'OPEN' });
  expect(prisma.$transaction).toHaveBeenCalled();
  });
});
