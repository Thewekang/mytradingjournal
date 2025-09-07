import { describe, it, expect } from 'vitest';
import { aggregateStats } from '@/lib/analytics';

describe('aggregate analytics edge cases', () => {
  it('handles SHORT and LONG with fees and multiplier clamp', () => {
    const now = new Date('2025-09-06T12:00:00Z');
    const trades = [
      { entryPrice: 100, exitPrice: 110, quantity: 1, fees: 2, direction: 'LONG' as const, contractMultiplier: 0, entryAt: now, exitAt: now }, // +8 (multiplier->1)
      { entryPrice: 200, exitPrice: 190, quantity: 2, fees: 4, direction: 'SHORT' as const, contractMultiplier: 5, entryAt: now, exitAt: now }, // (200-190)*2*5 -4 = 96
    ];
    const s = aggregateStats(trades);
    expect(Math.round(s.total)).toBe(104); // 8 + 96
    expect(s.trades).toBe(2);
    expect(s.winRate).toBe(1); // both positive after fees
    expect(s.avgHoldMinutes).toBe(0);
  });

  it('approximates partial exit by using provided quantity as realized slice', () => {
    const day1 = new Date('2025-09-05T10:00:00Z');
    const day2 = new Date('2025-09-06T10:00:00Z');
    const trades = [
      { entryPrice: 50, exitPrice: 55, quantity: 3, fees: 1, direction: 'LONG' as const, entryAt: day1, exitAt: day1 }, // +14
      { entryPrice: 60, exitPrice: 58, quantity: 1, fees: 0, direction: 'LONG' as const, entryAt: day2, exitAt: day2 }, // -2
    ];
    const s = aggregateStats(trades);
    expect(s.trades).toBe(2);
    expect(s.total).toBe(12);
    expect(s.dailyVariance).toBeGreaterThanOrEqual(0);
  });
});
