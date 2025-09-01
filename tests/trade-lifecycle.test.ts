import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTrade, updateTrade, deleteTrade, restoreTrade, listTrades } from '@/lib/services/trade-service';

async function ensureInstrument() {
  const sym = 'T' + Math.random().toString(36).slice(2,7).toUpperCase();
  return prisma.instrument.create({ data: { symbol: sym, name: sym, category: 'Test', currency: 'USD', tickSize: 0.01, contractMultiplier: 10 } });
}

describe('trade lifecycle service', () => {
  it('creates, updates (close), lists with realizedPnl, soft deletes and restores', async () => {
    const user = await prisma.user.create({ data: { email: `user-${Date.now()}@ex.com`, passwordHash: 'x', role: 'USER' } });
    const inst = await ensureInstrument();
    const created = await createTrade(user.id, { instrumentId: inst.id, direction: 'LONG', entryPrice: 100, quantity: 2, entryAt: new Date().toISOString(), fees: 1 });
    expect(created.id).toBeTruthy();
    expect(created.realizedPnl).toBeNull();
    const updated = await updateTrade(user.id, created.id, { exitPrice: 103, exitAt: new Date().toISOString(), status: 'CLOSED' });
    expect(updated?.status).toBe('CLOSED');
    // PnL: (103-100)*1(sign long)*2qty*10mult - fees(1) = 59
    expect(updated?.realizedPnl).toBe(59);
    const list = await listTrades(user.id, { limit: 10 });
    expect(list.items.find(t => t.id === created.id)?.realizedPnl).toBe(59);
    const deleted = await deleteTrade(user.id, created.id);
    expect(deleted).toBe(true);
  const postDelete = await listTrades(user.id, { limit: 10 });
    expect(postDelete.items.find(t => t.id === created.id)).toBeUndefined();
    const restored = await restoreTrade(user.id, created.id);
    expect(restored).toBe(true);
    const afterRestore = await listTrades(user.id, { limit: 10 });
    expect(afterRestore.items.find(t => t.id === created.id)).toBeTruthy();
  });
});
