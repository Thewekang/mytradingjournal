import { describe, it, expect } from 'vitest';

// Placeholder: In a full Next.js environment we'd spin up the server or test route handlers directly.
// For now, just verify validation schema behaves (acts as lightweight integration proxy).
import { tradeCreateSchema } from '@/lib/validation/trade';

describe('tradeCreateSchema', () => {
  it('validates minimal correct trade', () => {
    const data = {
      instrumentId: 'iid',
      direction: 'LONG',
      entryPrice: 100,
      quantity: 1,
      entryAt: new Date().toISOString(),
      fees: 0
    };
    const parsed = tradeCreateSchema.parse(data);
    expect(parsed.instrumentId).toBe('iid');
  });

  it('rejects negative price', () => {
    const data: any = {
      instrumentId: 'iid',
      direction: 'LONG',
      entryPrice: -1,
      quantity: 1,
      entryAt: new Date().toISOString()
    };
    try {
      tradeCreateSchema.parse(data);
      throw new Error('should fail');
    } catch (e: any) {
  expect(e.issues[0].message.toLowerCase()).toContain('expected number');
    }
  });
});
