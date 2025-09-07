import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from './trade-service';

// Normalize date to UTC start of day
function dayStart(d: Date){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }

export interface DailyEquityRow { date: Date; realizedPnl: number; cumulativeEquity: number; tradeCount: number }

export async function rebuildDailyEquity(userId: string, dateFrom?: Date){
  if(!dateFrom){ await prisma.dailyEquity.deleteMany({ where: { userId } }); }
  const settings = await prisma.journalSettings.findUnique({ where: { userId } });
  const baseEquity = settings?.initialEquity ?? 100000;
  // Fetch trades (closed) from dateFrom or all
  const where: any = { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } }; // eslint-disable-line @typescript-eslint/no-explicit-any
  if(dateFrom){ where.exitAt.gte = dateFrom; }
  const trades = await prisma.trade.findMany({ where, orderBy: { exitAt: 'asc' }, include: { instrument: { select: { contractMultiplier: true } } } });
  // If incremental, seed prior cumulative equity
  let cumulative = baseEquity;
  if(dateFrom){
    const prev = await prisma.dailyEquity.findFirst({ where: { userId, date: { lt: dayStart(dateFrom) } }, orderBy: { date: 'desc' } });
    if(prev) cumulative = prev.cumulativeEquity;
  }
  const byDay = new Map<string, { pnl: number; count: number }>();
  for(const t of trades){
    if(!t.exitAt) continue;
    const dKey = dayStart(t.exitAt).toISOString();
    const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier }) || 0;
    const agg = byDay.get(dKey) || { pnl:0, count:0 };
    agg.pnl += pnl; agg.count += 1; byDay.set(dKey, agg);
  }
  const entries = Array.from(byDay.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  const toUpsert: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  for(const [iso, agg] of entries){
    cumulative += agg.pnl;
    toUpsert.push({ date: new Date(iso), realizedPnl: +agg.pnl.toFixed(2), cumulativeEquity: +cumulative.toFixed(2), tradeCount: agg.count });
  }
  if (toUpsert.length) {
    const ops = toUpsert.map(row =>
      prisma.dailyEquity.upsert({
        where: { userId_date: { userId, date: row.date } },
        create: { userId, date: row.date, realizedPnl: row.realizedPnl, cumulativeEquity: row.cumulativeEquity, tradeCount: row.tradeCount },
        update: { realizedPnl: row.realizedPnl, cumulativeEquity: row.cumulativeEquity, tradeCount: row.tradeCount }
      })
    );
    await prisma.$transaction(ops);
  }
  // Update rebuild timestamp (best-effort)
  await prisma.journalSettings.update({ where: { userId }, data: { lastEquityRebuildAt: new Date(), lastEquityValidationAt: new Date() } }).catch(()=>{});
  return toUpsert as DailyEquityRow[];
}

// Recompute (incrementally) from the provided date (start of day) forward.
// This avoids double-counting when an already closed trade is edited; it recalculates the affected day
// and all subsequent cumulative equity values.
export async function rebuildDailyEquityFromDate(userId: string, date: Date){
  const start = dayStart(date);
  return rebuildDailyEquity(userId, start);
}

// Recompute daily equity purely in-memory (without mutating) and compare to stored rows.
// Returns list of discrepancies (date, stored, computed).
export async function validateDailyEquity(userId: string){
  // Fetch stored rows
  const stored = await prisma.dailyEquity.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  // Rebuild in memory (do not delete existing)
  const settings = await prisma.journalSettings.findUnique({ where: { userId } });
  const baseEquity = settings?.initialEquity ?? 100000;
  const trades = await prisma.trade.findMany({ where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } }, orderBy: { exitAt: 'asc' }, include: { instrument: { select: { contractMultiplier: true } } } });
  let cumulative = baseEquity;
  const byDay = new Map<string, { pnl: number; count: number }>();
  for(const t of trades){
    if(!t.exitAt) continue;
    const dKey = dayStart(t.exitAt).toISOString();
    const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier }) || 0;
    const agg = byDay.get(dKey) || { pnl:0, count:0 }; agg.pnl += pnl; agg.count += 1; byDay.set(dKey, agg);
  }
  const expected: Record<string, { realizedPnl: number; cumulativeEquity: number; tradeCount: number }> = {};
  Array.from(byDay.entries()).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([iso, agg]) => {
    cumulative += agg.pnl;
    expected[iso] = { realizedPnl: +agg.pnl.toFixed(2), cumulativeEquity: +cumulative.toFixed(2), tradeCount: agg.count };
  });
  const discrepancies: Array<{
    date: string;
    stored?: { realizedPnl: number; cumulativeEquity: number; tradeCount: number };
    expected?: { realizedPnl: number; cumulativeEquity: number; tradeCount: number };
    diff?: { realizedPnl?: number; cumulativeEquity?: number; tradeCount?: number };
  }> = [];
  const allDates = new Set<string>([...stored.map(r=>r.date.toISOString()), ...Object.keys(expected)]);
  for(const iso of Array.from(allDates).sort()){
    const s = stored.find(r=>r.date.toISOString()===iso);
    const e = expected[iso];
    const diff: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    if(s && e){
      if(Math.abs(s.realizedPnl - e.realizedPnl) > 0.009) diff.realizedPnl = +(e.realizedPnl - s.realizedPnl).toFixed(2);
      if(Math.abs(s.cumulativeEquity - e.cumulativeEquity) > 0.009) diff.cumulativeEquity = +(e.cumulativeEquity - s.cumulativeEquity).toFixed(2);
      if(s.tradeCount !== e.tradeCount) diff.tradeCount = e.tradeCount - s.tradeCount;
      if(Object.keys(diff).length) discrepancies.push({ date: iso, stored: { realizedPnl: s.realizedPnl, cumulativeEquity: s.cumulativeEquity, tradeCount: s.tradeCount }, expected: e, diff });
    } else if(s && !e){
      discrepancies.push({ date: iso, stored: { realizedPnl: s.realizedPnl, cumulativeEquity: s.cumulativeEquity, tradeCount: s.tradeCount } });
    } else if(!s && e){
      discrepancies.push({ date: iso, expected: e });
    }
  }
  // Update validation timestamp (best-effort)
  await prisma.journalSettings.update({ where: { userId }, data: { lastEquityValidationAt: new Date() } }).catch(()=>{});
  return { discrepancies, expectedCount: Object.keys(expected).length, storedCount: stored.length };
}

// Rebuild all users' daily equity (full) – intended for low-volume dev / small multi-user.
// For larger scale you'd batch or limit to users active in last N days.
export async function rebuildAllDailyEquity(){
  const users = await prisma.user.findMany({ select: { id: true } });
  const results: Record<string, number> = {};
  for(const u of users){
    const rows = await rebuildDailyEquity(u.id);
    results[u.id] = rows.length;
  }
  return results;
}
