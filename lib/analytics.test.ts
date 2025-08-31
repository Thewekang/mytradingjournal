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

  it('aggregates stats', () => {
    const trades: TradeLike[] = [
      base,
      { ...base, entryPrice: 100, exitPrice: 90, direction: 'LONG' },
      { ...base, entryPrice: 100, exitPrice: 120, direction: 'LONG' }
    ];
    const stats = aggregateStats(trades);
    expect(stats.trades).toBe(3);
    expect(stats.winRate).toBeCloseTo(2/3);
    expect(stats.total).toBeDefined();
  });
});
