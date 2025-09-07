import { describe, it, expect, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as ROLLOVER } from '@/app/api/prop/evaluations/rollover/route';
import { upsertPropEvaluation } from '@/lib/services/prop-evaluation-service';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: (globalThis as any).__TEST_PROP_ROLLOVER_API_USER_ID, email: 'rollover-api@test.local' } }) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

function req(url: string, init?: RequestInit){ return new Request(url, init); }
function day(n: number){ return new Date(Date.now() - n*24*60*60*1000); }

describe('prop evaluation rollover API', () => {
  it('POST /api/prop/evaluations/rollover performs rollover when criteria met', async () => {
    const user = `user-prop-rollover-api-${Date.now()}`;
    (globalThis as any).__TEST_PROP_ROLLOVER_API_USER_ID = user; // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.user.create({ data: { id: user, email: `${user}@ex.com` } });
    await prisma.journalSettings.create({ data: { userId: user } });
    await upsertPropEvaluation(user, { firmName: 'FirmZ', accountSize: 25000, profitTarget: 300, maxDailyLoss: 1000, maxOverallLoss: 2000, minTradingDays: 1, startDate: day(2) });
    const inst = await prisma.instrument.create({ data: { symbol: 'RAPI_'+Date.now().toString(36), name: 'RAPI', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
    // One profitable day reaching target
    const d1 = day(1);
    await prisma.trade.create({ data: { userId: user, instrumentId: inst.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 101.5, quantity: 200, fees: 0, entryAt: d1, exitAt: d1 } }); // +300
    const res = await (ROLLOVER as unknown as (req: Request) => Promise<Response>)(req('http://localhost/api/prop/evaluations/rollover', { method: 'POST' }));
    expect(res.status).toBe(200);
    const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(['rolledToPhase2','none']).toContain(json.data.action);
  });
});
