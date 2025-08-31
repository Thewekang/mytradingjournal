import { describe, it, expect } from 'vitest';
import { createInstrument } from '@/lib/services/instrument-service';

describe('instrument-service', () => {
  it('creates an instrument and enforces unique symbol', async () => {
    const sym = 'SYM' + Date.now();
    const inst1 = await createInstrument('user', { symbol: sym, name: 'Test', category: 'Cat', currency: 'USD', tickSize: 0.01 });
    expect(inst1.symbol).toBe(sym);
    await expect(createInstrument('user', { symbol: sym, name: 'Dup', category: 'Cat', currency: 'USD', tickSize: 0.01 }))
      .rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
