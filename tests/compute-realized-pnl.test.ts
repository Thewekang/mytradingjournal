import { describe, it, expect } from 'vitest';
import { computeRealizedPnl } from '../lib/services/trade-service';

describe('computeRealizedPnl', () => {
  it('returns null when exitPrice missing', () => {
    expect(computeRealizedPnl({ entryPrice: 100, quantity: 2, direction: 'LONG' })).toBeNull();
  });
  it('calculates LONG profit', () => {
    const pnl = computeRealizedPnl({ entryPrice: 100, exitPrice: 110, quantity: 1, direction: 'LONG', fees: 2 });
    expect(pnl).toBe(8); // (110-100)*1 -2
  });
  it('calculates SHORT profit', () => {
    const pnl = computeRealizedPnl({ entryPrice: 100, exitPrice: 90, quantity: 3, direction: 'SHORT', fees: 0 });
    expect(pnl).toBe(30); // (90-100)*-1*3
  });
  it('applies contract multiplier', () => {
    const pnl = computeRealizedPnl({ entryPrice: 50, exitPrice: 55, quantity: 2, direction: 'LONG', contractMultiplier: 10, fees: 5 });
    expect(pnl).toBe(95); // (55-50)*1*2*10 -5 = 100-5
  });
  it('handles negative (loss) correctly for LONG', () => {
    const pnl = computeRealizedPnl({ entryPrice: 120, exitPrice: 110, quantity: 1, direction: 'LONG', fees: 1 });
    expect(pnl).toBe(-11); // (110-120)*1*1 -1 = -10 -1
  });
});
