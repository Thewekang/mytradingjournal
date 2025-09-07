import { describe, it, expect } from 'vitest';
import { computeRealizedPnl } from '@/lib/services/trade-service';

describe('computeRealizedPnl edge cases', () => {
  it('SHORT profit when exit < entry', () => {
    const pnl = computeRealizedPnl({ entryPrice: 100, exitPrice: 90, quantity: 2, direction: 'SHORT', fees: 0, contractMultiplier: 1 });
    expect(pnl).toBe(20);
  });
  it('SHORT loss when exit > entry (with fees)', () => {
    const pnl = computeRealizedPnl({ entryPrice: 100, exitPrice: 110, quantity: 1, direction: 'SHORT', fees: 1.5, contractMultiplier: 1 });
    expect(pnl).toBe(-11.5);
  });
  it('zero or negative multiplier behaves like 1x', () => {
    const p0 = computeRealizedPnl({ entryPrice: 100, exitPrice: 101, quantity: 1, direction: 'LONG', fees: 0, contractMultiplier: 0 });
    const pn = computeRealizedPnl({ entryPrice: 100, exitPrice: 101, quantity: 1, direction: 'LONG', fees: 0, contractMultiplier: -5 });
    const p1 = computeRealizedPnl({ entryPrice: 100, exitPrice: 101, quantity: 1, direction: 'LONG', fees: 0, contractMultiplier: 1 });
    expect(p0).toBe(p1);
    expect(pn).toBe(p1);
  });
  it('null exit returns null', () => {
    const pnl = computeRealizedPnl({ entryPrice: 100, exitPrice: null, quantity: 1, direction: 'LONG', fees: 0, contractMultiplier: 1 });
    expect(pnl).toBeNull();
  });
});
