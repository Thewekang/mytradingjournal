import { describe, it, expect } from 'vitest';
import { computeRealizedPnl } from '@/lib/services/trade-service';

// Self-contained unit test (no Prisma): verifies we aggregate per-tag PnL correctly
// using the same computeRealizedPnl helper as production code.
describe('tag performance analytics', () => {
  it('aggregates pnl per tag', async () => {
    const tagA = { id: 'tagA', label: 'Setup:A' };
    const tagB = { id: 'tagB', label: 'Emotion:FOMO' };

    const trades = [
      {
        id: 't1',
        direction: 'LONG' as const,
        entryPrice: 100,
        exitPrice: 110,
        quantity: 1,
        fees: 0,
        tagIds: [tagA.id]
      },
      {
        id: 't2',
        direction: 'SHORT' as const,
        entryPrice: 50,
        exitPrice: 55,
        quantity: 1,
        fees: 0,
        tagIds: [tagA.id, tagB.id]
      }
    ];

    let tagASum = 0;
    let tagACount = 0;
    for (const t of trades) {
      if (t.tagIds.includes(tagA.id)) {
        const pnl =
          computeRealizedPnl({
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            quantity: t.quantity,
            direction: t.direction,
            fees: t.fees
          }) || 0;
        tagASum += pnl;
        tagACount++;
      }
    }

    expect(tagACount).toBe(2);
    expect(tagASum).toBe(5);
  });
});
