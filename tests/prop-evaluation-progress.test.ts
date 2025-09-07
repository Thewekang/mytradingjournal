import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { upsertPropEvaluation, computeEvaluationProgress } from '@/lib/services/prop-evaluation-service';

// NOTE: This is a lightweight smoke test; full coverage after migration & model regeneration.
describe('prop evaluation progress', () => {
  const baseUser = 'user-prop-test';
  beforeAll(async () => {
    await prisma.user.upsert({ where: { id: baseUser }, update: {}, create: { id: baseUser, email: baseUser+'@test.local' } });
    await upsertPropEvaluation(baseUser, { firmName: 'FirmX', accountSize: 100000, profitTarget: 8000, maxDailyLoss: 5000, maxOverallLoss: 10000, startDate: new Date(Date.now() - 2*24*60*60*1000) });
  });

  it('computes progress (no trades)', async () => {
    const progress = await computeEvaluationProgress(baseUser);
    expect(progress).not.toBeNull();
    if (progress) {
      expect(progress.cumulativeProfit).toBe(0);
      expect(progress.remainingTarget).toBe(8000);
      expect(progress.alerts.find(a=>a.code==='PF_INCONSISTENT_DAY')).toBeUndefined();
    }
  });

  it('flags inconsistent day when one day far below top day within consistency band', async () => {
    const userId = 'user-prop-consistency';
  await prisma.trade.deleteMany({ where: { userId } });
  await (prisma as any).propEvaluation.deleteMany({ where: { userId } }); // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: userId+'@test.local' } });
    // Consistency band 0.6 – trigger by having a large day and a tiny day
    await upsertPropEvaluation(userId, { firmName: 'FirmY', accountSize: 50000, profitTarget: 5000, maxDailyLoss: 2500, maxOverallLoss: 5000, consistencyBand: 0.6, startDate: new Date(Date.now() - 3*24*60*60*1000) });
    const day1 = new Date(Date.now() - 2*24*60*60*1000);
    const day2 = new Date(Date.now() - 1*24*60*60*1000);
    // Big win day (e.g., +2000)
  const instA = await prisma.instrument.create({ data: { symbol: 'AAA_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'A', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  await prisma.trade.create({ data: { userId, instrumentId: instA.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 120, quantity: 10, fees: 0, entryAt: day1, exitAt: day1 } });
    // Small win day (+100) -> ratio 100/2000 = 0.05 < 0.6 * 0.25 (0.15) triggers inconsistent
  const instB = await prisma.instrument.create({ data: { symbol: 'BBB_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'B', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  await prisma.trade.create({ data: { userId, instrumentId: instB.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 105, quantity: 2, fees: 0, entryAt: day2, exitAt: day2 } });
    const progress = await computeEvaluationProgress(userId);
    expect(progress?.alerts.some(a=>a.code==='PF_INCONSISTENT_DAY')).toBe(true);
  });

  it('emits near trailing then breach alerts for trailing evaluation', { timeout: 25_000 }, async () => {
    const userId = 'user-prop-trailing';
  await prisma.trade.deleteMany({ where: { userId } });
  await (prisma as any).propEvaluation.deleteMany({ where: { userId } }); // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: userId+'@test.local' } });
    await upsertPropEvaluation(userId, { firmName: 'FirmTrail', accountSize: 100000, profitTarget: 3000, maxDailyLoss: 4000, maxOverallLoss: 6000, trailing: true, startDate: new Date(Date.now() - 2*24*60*60*1000) });
    const d1 = new Date(Date.now() - 1*24*60*60*1000);
  // Gain to raise peak equity +6000 (simulate a strong day)
  const inst1 = await prisma.instrument.create({ data: { symbol: 'TR1_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'TR1', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  await prisma.trade.create({ data: { userId, instrumentId: inst1.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 160, quantity: 100, fees: 0, entryAt: d1, exitAt: d1 } }); // +60 * 100 = +6000
  // Loss today bringing equity close (within 1200) to trailing floor but not breaching
    const today = new Date();
  // Peak equity = 106000; trailing floor = 100000 (floor = peak - 6000)
  // Need cumulative profit after loss between (0,1200] to trigger near trailing: target cumulative 1000.
  // Loss required = 6000 - 1000 = 5000.
  const inst2 = await prisma.instrument.create({ data: { symbol: 'TR2_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'TR2', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  await prisma.trade.create({ data: { userId, instrumentId: inst2.id, direction: 'LONG', status: 'CLOSED', entryPrice: 200, exitPrice: 150, quantity: 100, fees: 0, entryAt: today, exitAt: today } }); // -50 * 100 = -5000 (cumulative now +1000)
    // Poll for near trailing alert (allow a few iterations in case of eventual consistency)
    let progress = null as Awaited<ReturnType<typeof computeEvaluationProgress>>;
    const startNear = Date.now();
    while (Date.now() - startNear < 4000) {
      progress = await computeEvaluationProgress(userId);
      if (progress?.alerts.some(a=>a.code==='PF_NEAR_TRAILING')) break;
      await new Promise(r => setTimeout(r, 120));
    }
    expect(progress?.alerts.some(a=>a.code==='PF_NEAR_TRAILING')).toBe(true);
    expect(progress?.alerts.some(a=>a.code==='PF_TRAILING_BREACH')).toBe(false);
  // Additional loss to breach floor: need cumulative <= 0 (loss 1000 more)
  const inst3 = await prisma.instrument.create({ data: { symbol: 'TR3_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'TR3', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  await prisma.trade.create({ data: { userId, instrumentId: inst3.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 90, quantity: 100, fees: 0, entryAt: today, exitAt: today } }); // -10 * 100 = -1000 (breach)
  // Small debounce to ensure previous trade commit is fully visible in any cached layers
    await new Promise(r => setTimeout(r, 50));
    const startBreach = Date.now();
    while (Date.now() - startBreach < 4000) {
      progress = await computeEvaluationProgress(userId);
      if (progress?.alerts.some(a=>a.code==='PF_TRAILING_BREACH')) break;
      await new Promise(r => setTimeout(r, 120));
    }
    expect(progress?.alerts.some(a=>a.code==='PF_TRAILING_BREACH')).toBe(true);
  });

  it('emits near target alert when on pace to finish within <3 days', async () => {
    const userId = 'user-prop-neartarget';
  await prisma.trade.deleteMany({ where: { userId } });
  await (prisma as any).propEvaluation.deleteMany({ where: { userId } }); // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: userId+'@test.local' } });
    // target 900, create two profitable days totaling 600 -> avg 300 -> remaining 300 -> projected 1 day (<3)
    await upsertPropEvaluation(userId, { firmName: 'FirmNT', accountSize: 25000, profitTarget: 900, maxDailyLoss: 2000, maxOverallLoss: 4000, startDate: new Date(Date.now() - 2*24*60*60*1000) });
    const inst = await prisma.instrument.create({ data: { symbol: 'NT_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'NT', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
    const day1 = new Date(Date.now() - 2*24*60*60*1000);
    const day2 = new Date(Date.now() - 1*24*60*60*1000);
    // +300 each day (entry 100 exit 103 qty 100)
    await prisma.trade.create({ data: { userId, instrumentId: inst.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 103, quantity: 100, fees: 0, entryAt: day1, exitAt: day1 } });
    await prisma.trade.create({ data: { userId, instrumentId: inst.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 103, quantity: 100, fees: 0, entryAt: day2, exitAt: day2 } });
    const progress = await computeEvaluationProgress(userId);
    expect(progress?.alerts.some(a=>a.code==='PF_NEAR_TARGET')).toBe(true);
    expect(progress?.alerts.some(a=>a.code==='PF_TARGET_REACHED')).toBe(false);
  });

  it('emits target reached alert when cumulative >= target', async () => {
    const userId = 'user-prop-targetreached';
  await prisma.trade.deleteMany({ where: { userId } });
  await (prisma as any).propEvaluation.deleteMany({ where: { userId } }); // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: userId+'@test.local' } });
    await upsertPropEvaluation(userId, { firmName: 'FirmTR', accountSize: 15000, profitTarget: 500, maxDailyLoss: 1000, maxOverallLoss: 2000, startDate: new Date(Date.now() - 1*24*60*60*1000) });
    const inst = await prisma.instrument.create({ data: { symbol: 'TRT_'+Date.now()+Math.random().toString(36).slice(2,4), name: 'TRT', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
    const day1 = new Date(Date.now() - 1*24*60*60*1000);
    // +600 profit (entry 100 exit 106 qty 100)
    await prisma.trade.create({ data: { userId, instrumentId: inst.id, direction: 'LONG', status: 'CLOSED', entryPrice: 100, exitPrice: 106, quantity: 100, fees: 0, entryAt: day1, exitAt: day1 } });
    const progress = await computeEvaluationProgress(userId);
    expect(progress?.alerts.some(a=>a.code==='PF_TARGET_REACHED')).toBe(true);
  });
});
