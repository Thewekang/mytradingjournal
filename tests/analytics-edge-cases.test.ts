import { describe, it, expect } from 'vitest';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('analytics edge cases', () => {
  it('SHORT with fees and multiplier', () => {
    const pnl = computeRealizedPnl({ entryPrice: 150, exitPrice: 140, quantity: 2, direction: 'SHORT', fees: 3, contractMultiplier: 5 });
    // (140-150)*-1*2*5 -3 = ( -10 * -1 * 10 ) -3 = 100 -3 = 97
    expect(pnl).toBe(97);
  });

  it('LONG with zero multiplier behaves like 1x', () => {
    const pnl0 = computeRealizedPnl({ entryPrice: 10, exitPrice: 12, quantity: 10, direction: 'LONG', fees: 0, contractMultiplier: 0 });
    const pnl1 = computeRealizedPnl({ entryPrice: 10, exitPrice: 12, quantity: 10, direction: 'LONG', fees: 0, contractMultiplier: 1 });
    expect(pnl0).toBe(pnl1);
  });

  it('returns null without exit', () => {
    expect(computeRealizedPnl({ entryPrice: 10, quantity: 1, direction: 'SHORT' })).toBeNull();
  });

  it('partial exit approximation (treats provided exit as realized slice)', () => {
    // When only part is closed, quantity reflects realized slice; multiplier defaults to 1
    const realized = computeRealizedPnl({ entryPrice: 100, exitPrice: 105, quantity: 3, direction: 'LONG', fees: 2 });
    // (105-100) * 3 = 15, minus fees 2 = 13
    expect(realized).toBe(13);
  });
});
