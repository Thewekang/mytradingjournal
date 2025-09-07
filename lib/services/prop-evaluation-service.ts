import { prisma } from '@/lib/prisma';

// Safe column projection to tolerate environments missing optional columns (e.g., maxSingleTradeRisk)
const SAFE_EVAL_SELECT = {
  id: true, userId: true, firmName: true, phase: true, accountSize: true, profitTarget: true,
  maxDailyLoss: true, maxOverallLoss: true, trailing: true, minTradingDays: true, consistencyBand: true,
  startDate: true, endDate: true, status: true, cumulativeProfit: true, peakEquity: true, createdAt: true, updatedAt: true,
} as const;

export interface EvaluationProgress {
  id: string;
  phase: string;
  status: string;
  cumulativeProfit: number;
  profitTarget: number;
  progressPct: number;
  maxDailyLoss: number;
  maxOverallLoss: number;
  remainingTarget: number;
  remainingDailyLoss?: number;
  remainingOverallLoss?: number;
  daysTraded: number;
  minTradingDays: number;
  projectedDaysToTarget?: number;
  alerts: { code: string; level: 'INFO' | 'WARN' | 'BLOCK'; message: string }[];
}

export async function getActiveEvaluation(userId: string) {
  // Explicitly select known-safe columns to avoid querying optional fields that may not exist in older DBs
  const safeSelect = {
    id: true, userId: true, firmName: true, phase: true, accountSize: true, profitTarget: true,
    maxDailyLoss: true, maxOverallLoss: true, trailing: true, minTradingDays: true, consistencyBand: true,
    startDate: true, endDate: true, status: true, cumulativeProfit: true, peakEquity: true, createdAt: true, updatedAt: true,
  } as const;
  const client = prisma as unknown as {
    propEvaluation: {
      findFirst: (args: {
        where: { userId: string; status: string };
        orderBy: { createdAt: 'desc' };
        select: {
          id: true; userId: true; firmName: true; phase: true; accountSize: true; profitTarget: true;
          maxDailyLoss: true; maxOverallLoss: true; trailing: true; minTradingDays: true; consistencyBand: true;
          startDate: true; endDate: true; status: true; cumulativeProfit: true; peakEquity: true; createdAt: true; updatedAt: true;
        }
      }) => Promise<{
        id: string; userId: string; firmName: string; phase: string; accountSize: number; profitTarget: number;
        maxDailyLoss: number; maxOverallLoss: number; trailing: boolean; minTradingDays: number; consistencyBand: number | null;
        startDate: Date; endDate: Date | null; status: string; cumulativeProfit: number; peakEquity: number; createdAt: Date; updatedAt: Date;
      } | null>
    }
  };
  return client.propEvaluation.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: safeSelect
  });
}

export async function computeEvaluationProgress(userId: string): Promise<EvaluationProgress | null> {
  const evaln = await getActiveEvaluation(userId);
  if (!evaln) return null;
  // Aggregate closed trades since startDate
  const trades = await prisma.trade.findMany({ where: { userId, deletedAt: null, status: 'CLOSED', exitAt: { gte: evaln.startDate } }, orderBy: { exitAt: 'asc' }, include: { instrument: { select: { contractMultiplier: true } } } });
  let cumulative = 0;
  let peakEquity = evaln.peakEquity || 0;
  const byDay: Record<string, number> = {};
  const dayPnlForConsistency: number[] = []; // ordered later
  for (const t of trades) {
    if (t.exitAt == null) continue;
    const sign = t.direction === 'LONG' ? 1 : -1;
    const mult = t.instrument?.contractMultiplier ?? 1;
    const pnl = (t.exitPrice! - t.entryPrice) * sign * t.quantity * mult - (t.fees || 0);
    cumulative += pnl;
    const eq = evaln.accountSize + cumulative;
    if (eq > peakEquity) peakEquity = eq;
    const day = t.exitAt.toISOString().slice(0,10);
    byDay[day] = (byDay[day] || 0) + pnl;
  }
  // Consistency band: identify largest day pnl and compare others; if band set (>0), warn when outside band
  const orderedDays = Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0]));
  for (const [, pnl] of orderedDays) dayPnlForConsistency.push(pnl);
  const todayKey = new Date().toISOString().slice(0,10);
  const todayLoss = (byDay[todayKey] || 0) < 0 ? Math.abs(byDay[todayKey]) : 0;
  const realizedDrawdown = evaln.accountSize + cumulative - peakEquity; // negative or 0
  const dailyLossRemaining = evaln.maxDailyLoss - todayLoss;
  const overallLossRemaining = evaln.maxOverallLoss - Math.abs(realizedDrawdown);
  const remainingTarget = evaln.profitTarget - cumulative;
  const daysTraded = Object.keys(byDay).length;
  const avgDailyProfit = daysTraded ? cumulative / daysTraded : 0;
  const projectedDaysToTarget = remainingTarget > 0 && avgDailyProfit > 0 ? remainingTarget / avgDailyProfit : undefined;
  // Alerts
  const alerts: EvaluationProgress['alerts'] = [];
  const pct = cumulative / evaln.profitTarget * 100;
  if (remainingTarget <= 0) alerts.push({ code: 'PF_TARGET_REACHED', level: 'INFO', message: 'Profit target reached' });
  if (avgDailyProfit > 0 && projectedDaysToTarget && projectedDaysToTarget < 3) alerts.push({ code: 'PF_NEAR_TARGET', level: 'INFO', message: 'On pace to hit target in <3 days' });
  if (todayLoss >= 0.8 * evaln.maxDailyLoss) alerts.push({ code: 'PF_NEAR_DAILY_LOSS', level: 'WARN', message: 'Approaching daily loss limit' });
  if (todayLoss > evaln.maxDailyLoss) alerts.push({ code: 'PF_DAILY_LOSS', level: 'BLOCK', message: 'Daily loss limit exceeded' });
  if (Math.abs(realizedDrawdown) >= 0.8 * evaln.maxOverallLoss) alerts.push({ code: 'PF_NEAR_OVERALL_LOSS', level: 'WARN', message: 'Approaching overall loss limit' });
  if (Math.abs(realizedDrawdown) > evaln.maxOverallLoss) alerts.push({ code: 'PF_OVERALL_LOSS', level: 'BLOCK', message: 'Overall loss limit exceeded' });
  // Consistency evaluation
  if (evaln.consistencyBand && evaln.consistencyBand > 0 && dayPnlForConsistency.length > 1) {
    const maxDay = Math.max(...dayPnlForConsistency.map(v => Math.abs(v)));
    for (const v of dayPnlForConsistency) {
      const ratio = Math.abs(v) / (maxDay || 1);
      if (ratio > 0 && ratio < evaln.consistencyBand * 0.25) {
        alerts.push({ code: 'PF_INCONSISTENT_DAY', level: 'INFO', message: 'One day PnL far below top day (consistency watch)' });
        break;
      }
    }
  }
  // Trailing drawdown (if trailing true): compute trailing limit breach
  if (evaln.trailing) {
    const trailingEquityFloor = peakEquity - evaln.maxOverallLoss;
    const currentEquity = evaln.accountSize + cumulative;
    if (currentEquity <= trailingEquityFloor) {
      alerts.push({ code: 'PF_TRAILING_BREACH', level: 'BLOCK', message: 'Trailing drawdown breach' });
    } else if (currentEquity - trailingEquityFloor <= evaln.maxOverallLoss * 0.2) {
      alerts.push({ code: 'PF_NEAR_TRAILING', level: 'WARN', message: 'Approaching trailing drawdown limit' });
    }
  }
  return {
    id: evaln.id,
    phase: evaln.phase,
    status: evaln.status,
    cumulativeProfit: Number(cumulative.toFixed(2)),
    profitTarget: evaln.profitTarget,
    progressPct: Number(pct.toFixed(2)),
    maxDailyLoss: evaln.maxDailyLoss,
    maxOverallLoss: evaln.maxOverallLoss,
    remainingTarget: Number(remainingTarget.toFixed(2)),
    remainingDailyLoss: Number(dailyLossRemaining.toFixed(2)),
    remainingOverallLoss: Number(overallLossRemaining.toFixed(2)),
    daysTraded,
    minTradingDays: evaln.minTradingDays,
    projectedDaysToTarget: projectedDaysToTarget ? Number(projectedDaysToTarget.toFixed(1)) : undefined,
    alerts
  };
}

export async function upsertPropEvaluation(userId: string, data: { firmName: string; phase?: string; accountSize: number; profitTarget: number; maxDailyLoss: number; maxOverallLoss: number; maxSingleTradeRisk?: number; trailing?: boolean; minTradingDays?: number; consistencyBand?: number; startDate: Date; }) {
  // Only one ACTIVE allowed
  const existing = await getActiveEvaluation(userId);
  // Build safe payloads without assuming the presence of optional columns in the database
  const baseUpdate = { firmName: data.firmName, phase: data.phase || (existing?.phase ?? 'PHASE1'), accountSize: data.accountSize, profitTarget: data.profitTarget, maxDailyLoss: data.maxDailyLoss, maxOverallLoss: data.maxOverallLoss, trailing: data.trailing ?? false, minTradingDays: data.minTradingDays ?? 0, consistencyBand: data.consistencyBand, startDate: data.startDate } as Record<string, unknown>;
  const baseCreate = { userId, ...baseUpdate } as Record<string, unknown>;
  // Attempt to include maxSingleTradeRisk; if the column is missing, catch and retry without it
  const safeSelect = {
    id: true, userId: true, firmName: true, phase: true, accountSize: true, profitTarget: true,
    maxDailyLoss: true, maxOverallLoss: true, trailing: true, minTradingDays: true, consistencyBand: true,
    startDate: true, endDate: true, status: true, cumulativeProfit: true, peakEquity: true, createdAt: true, updatedAt: true,
  } as const;
  const client = prisma as unknown as { propEvaluation: { update: (args: { where: { id: string }; data: Record<string, unknown>; select: typeof safeSelect }) => Promise<unknown>; create: (args: { data: Record<string, unknown>; select: typeof safeSelect }) => Promise<unknown> } };
  if (existing) {
    try {
      return await client.propEvaluation.update({ where: { id: existing.id }, data: { ...baseUpdate, maxSingleTradeRisk: data.maxSingleTradeRisk ?? null, updatedAt: new Date() }, select: safeSelect });
    } catch {
      return await client.propEvaluation.update({ where: { id: existing.id }, data: { ...baseUpdate, updatedAt: new Date() }, select: safeSelect });
    }
  }
  try {
    return await client.propEvaluation.create({ data: { ...baseCreate, maxSingleTradeRisk: data.maxSingleTradeRisk ?? null }, select: safeSelect });
  } catch {
    return await client.propEvaluation.create({ data: baseCreate, select: safeSelect });
  }
}

export type RolloverAction = 'none' | 'failed' | 'rolledToPhase2' | 'rolledToFunded';

export async function evaluateAndMaybeRollover(userId: string): Promise<{ action: RolloverAction; current?: unknown; next?: unknown }>{
  // Fetch active evaluation
  const active = await getActiveEvaluation(userId);
  if (!active) return { action: 'none' };
  // Compute current status snapshot
  const progress = await computeEvaluationProgress(userId);
  if (!progress) return { action: 'none' };

  // Determine fail conditions from alerts
  const hasBlockBreach = progress.alerts.some(a => a.level === 'BLOCK' && (a.code === 'PF_DAILY_LOSS' || a.code === 'PF_OVERALL_LOSS' || a.code === 'PF_TRAILING_BREACH'));
  // Determine pass: meets target and min trading days
  const meetsTarget = progress.remainingTarget <= 0;
  const meetsMinDays = progress.daysTraded >= progress.minTradingDays;

  // Short-circuit: failure
  if (hasBlockBreach) {
  const now = new Date();
  await prisma.propEvaluation.updateMany({ where: { id: active.id }, data: { status: 'FAILED', endDate: now } });
  const failed = await prisma.propEvaluation.findUnique({ where: { id: active.id }, select: SAFE_EVAL_SELECT });
  return { action: 'failed', current: failed };
  }

  // Not failed: check pass + rollover
  if (meetsTarget && meetsMinDays) {
    // Snapshot now for updates
    const now = new Date();
    if (active.phase === 'PHASE1') {
      await prisma.propEvaluation.updateMany({ where: { id: active.id }, data: { status: 'PASSED', endDate: now } });
      const passed = await prisma.propEvaluation.findUnique({ where: { id: active.id }, select: SAFE_EVAL_SELECT });
      const next = await prisma.propEvaluation.create({ data: {
        userId,
        firmName: active.firmName,
        phase: 'PHASE2',
        accountSize: active.accountSize,
        profitTarget: active.profitTarget,
        maxDailyLoss: active.maxDailyLoss,
        maxOverallLoss: active.maxOverallLoss,
        // optional fields defaulting conservatively
        trailing: active.trailing ?? false,
        minTradingDays: active.minTradingDays ?? 0,
        consistencyBand: active.consistencyBand ?? null,
        startDate: now,
        status: 'ACTIVE'
      }, select: SAFE_EVAL_SELECT });
      return { action: 'rolledToPhase2', current: passed, next };
    }
    if (active.phase === 'PHASE2') {
      // Roll to funded minimal record
      await prisma.propEvaluation.updateMany({ where: { id: active.id }, data: { status: 'PASSED', endDate: now } });
      const passed = await prisma.propEvaluation.findUnique({ where: { id: active.id }, select: SAFE_EVAL_SELECT });
      const next = await prisma.propEvaluation.create({ data: {
        userId,
        firmName: active.firmName,
        phase: 'FUNDED',
        accountSize: active.accountSize,
        // funded has no profit target requirement here
        profitTarget: 0,
        maxDailyLoss: active.maxDailyLoss,
        maxOverallLoss: active.maxOverallLoss,
        trailing: active.trailing ?? false,
        minTradingDays: 0,
        consistencyBand: active.consistencyBand ?? null,
        startDate: now,
        status: 'ACTIVE'
      }, select: SAFE_EVAL_SELECT });
      return { action: 'rolledToFunded', current: passed, next };
    }
  }

  return { action: 'none' };
}
