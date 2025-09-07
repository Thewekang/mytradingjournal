import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTrade, updateTrade } from '@/lib/services/trade-service';

async function seed(){
  const user = await prisma.user.create({ data: { email: `eq-int-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id, initialEquity: 10000 } });
  const inst = await prisma.instrument.create({ data: { symbol: 'EQINT-'+Date.now(), name: 'Eq Int', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  return { userId: user.id, instrumentId: inst.id };
}

describe('DailyEquity integration with trade lifecycle', () => {
  it('creates snapshot when trade closed', async () => {
    const { userId, instrumentId } = await seed();
    const t = await createTrade(userId, { instrumentId, direction: 'LONG', entryPrice: 100, quantity: 1, entryAt: new Date().toISOString(), fees: 0 });
    expect(t.status).toBe('OPEN');
    const closed = await updateTrade(userId, t.id, { exitPrice: 110, exitAt: new Date().toISOString(), status: 'CLOSED' });
    expect(closed?.status).toBe('CLOSED');
    // Poll for snapshot (fire-and-forget update runs after transaction commit)
    let snapshotsLen = 0;
    for(let i=0;i<20;i++){
      await new Promise(r => setTimeout(r, 50 + i*20));
      let snapshots: unknown[] = [];
      const anyClient = prisma as unknown as { dailyEquity?: { findMany: (args: any) => Promise<unknown[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any
      if(anyClient.dailyEquity?.findMany){
        snapshots = await anyClient.dailyEquity.findMany({ where: { userId } });
      } else {
        snapshots = await prisma.$queryRawUnsafe('SELECT * FROM "DailyEquity" WHERE "userId" = $1', userId) as unknown[];
      }
      snapshotsLen = snapshots.length;
      if(snapshotsLen>0) break;
    }
    expect(snapshotsLen).toBeGreaterThan(0);
  }, 10000);
});
