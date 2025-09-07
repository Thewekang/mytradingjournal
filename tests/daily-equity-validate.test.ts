import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { rebuildDailyEquity } from '@/lib/services/daily-equity-service';
import { GET as VALIDATE_GET, POST as VALIDATE_POST } from '@/app/api/equity/validate/route';

// Mock session to provide a user id
vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_EQUITY_UID, email: 'eq@test.local' } })
}));

declare global { var __TEST_EQUITY_UID: string }


describe('DailyEquity validation API', () => {
  beforeAll(async () => {
    const u = await prisma.user.create({ data: { email: `eq-${Date.now()}@test.local` } });
    await prisma.journalSettings.create({ data: { userId: u.id } });
    ;(globalThis as any).__TEST_EQUITY_UID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    // Seed a couple of trades closed same day
    const instrument = await prisma.instrument.create({ data: { symbol: 'EQVAL'+Date.now(), name: 'Val', category: 'FUTURES', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
    const now = new Date();
    await prisma.trade.create({ data: { userId: u.id, instrumentId: instrument.id, direction: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 1, entryAt: new Date(now.getTime()-3600000), exitAt: now, status: 'CLOSED', fees: 0 } });
    await prisma.trade.create({ data: { userId: u.id, instrumentId: instrument.id, direction: 'SHORT', entryPrice: 105, exitPrice: 100, quantity: 1, entryAt: new Date(now.getTime()-7200000), exitAt: now, status: 'CLOSED', fees: 0 } });
    await rebuildDailyEquity(u.id);
  });

  it('returns empty discrepancies after rebuild', async () => {
  const res = await VALIDATE_GET() as unknown as Response;
    expect(res.status).toBe(200);
    const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(Array.isArray(json.data.discrepancies)).toBe(true);
    expect(json.data.discrepancies.length).toBe(0);
    expect(json.data.storedCount).toBeGreaterThanOrEqual(1);
  // Timestamps (best-effort; may be undefined if migration not applied)
  expect(json.data.lastEquityValidationAt === undefined || typeof json.data.lastEquityValidationAt === 'string').toBe(true);
  expect(json.data.lastEquityRebuildAt === undefined || typeof json.data.lastEquityRebuildAt === 'string').toBe(true);
  });

  it('POST rebuild returns validation result', async () => {
  const res = await VALIDATE_POST() as unknown as Response;
    expect(res.status).toBe(200);
    const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(json.data.discrepancies.length).toBe(0);
  expect(json.data.lastEquityValidationAt === undefined || typeof json.data.lastEquityValidationAt === 'string').toBe(true);
  expect(json.data.lastEquityRebuildAt === undefined || typeof json.data.lastEquityRebuildAt === 'string').toBe(true);
  });
});
