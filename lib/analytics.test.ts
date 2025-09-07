import { calcPnL, aggregateStats, TradeDirection, TradeLike } from './analytics';
import { describe, it, expect } from 'vitest';

describe('analytics', () => {
  const base: Omit<TradeLike,'direction'> & { direction: TradeDirection } = {
    entryPrice: 100,
    exitPrice: 110,
    quantity: 1,
    fees: 2,
    direction: 'LONG'
  };

  it('calculates pnl long', () => {
    expect(calcPnL(base)!).toBeCloseTo(8); // (110-100)-2
  });

  it('aggregates stats including hold time & daily variance', () => {
    const now = Date.now();
    const mk = (offsetMinutes: number, exitOffsetMinutes: number, exitPrice: number): TradeLike & { entryAt: Date; exitAt: Date } => ({
      ...base,
      entryPrice: 100,
      exitPrice,
      entryAt: new Date(now + offsetMinutes * 60000),
      exitAt: new Date(now + exitOffsetMinutes * 60000)
    });
    const trades: (TradeLike & { entryAt: Date; exitAt: Date })[] = [
      mk(0, 30, 110), // +8
      mk(60, 120, 90), // -12 ( (90-100)-2 )
      mk(180, 240, 120) // +18 ( (120-100)-2 )
    ];
    const stats = aggregateStats(trades);
    expect(stats.trades).toBe(3);
    expect(stats.winRate).toBeCloseTo(2/3);
    expect(stats.total).toBeDefined();
    expect(stats.avgHoldMinutes).toBeGreaterThan(0);
    expect(stats.dailyVariance).toBeGreaterThanOrEqual(0);
  });
});
