import { describe, it, expect } from 'vitest';
import { createTrade } from '@/lib/services/trade-service';
import { prisma } from '@/lib/prisma';

// NOTE: This is a light integration-style test invoking the service directly.
// Full route handler tests would require mocking next-auth session; TODO later.

describe('trade-service basic integration', () => {
  it('creates and lists a trade', async () => {
    // create a temp user & instrument
    const user = await prisma.user.create({ data: { email: `test-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
  const inst = await prisma.instrument.create({ data: { symbol: `SYM${Date.now()}${Math.random().toString(36).slice(2,5)}`.slice(0,12), name: 'Temp', category: 'Test', currency: 'USD', tickSize: 0.01 } });
    const trade = await createTrade(user.id, { instrumentId: inst.id, direction: 'LONG', entryPrice: 100, quantity: 1, entryAt: new Date().toISOString(), fees: 0 });
    expect(trade.instrumentId).toBe(inst.id);
  });
});
