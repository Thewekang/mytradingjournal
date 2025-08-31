import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const goalTypeEnum = z.enum(['TOTAL_PNL','TRADE_COUNT','WIN_RATE','PROFIT_FACTOR','EXPECTANCY','AVG_LOSS_CAP','DAILY_GREEN_STREAK','ROLLING_30D_PNL','ROLLING_WINDOW_PNL']);
export const goalPeriodEnum = z.enum(['MONTH','QUARTER','YEAR']);

export const goalCreateSchema = z.object({
  type: goalTypeEnum,
  period: goalPeriodEnum,
  targetValue: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  windowDays: z.number().int().positive().max(365).optional(), // only for ROLLING_WINDOW_PNL
});

export const goalUpdateSchema = z.object({
  targetValue: z.number().positive().optional(),
  currentValue: z.number().min(0).optional(),
  achievedAt: z.string().datetime().nullable().optional(),
});

export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

export async function createGoal(userId: string, input: GoalCreateInput) {
  return prisma.goal.create({ data: { userId, type: input.type, period: input.period, targetValue: input.targetValue, currentValue: 0, startDate: new Date(input.startDate), endDate: new Date(input.endDate), windowDays: input.windowDays } });
}

export async function listGoals(userId: string) {
  return prisma.goal.findMany({ where: { userId }, orderBy: { endDate: 'asc' } });
}

export async function updateGoal(userId: string, id: string, input: GoalUpdateInput) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return null;
  const data: any = {};
  if (input.targetValue !== undefined) data.targetValue = input.targetValue;
  if (input.currentValue !== undefined) data.currentValue = input.currentValue;
  if (input.achievedAt !== undefined) data.achievedAt = input.achievedAt ? new Date(input.achievedAt) : null;
  return prisma.goal.update({ where: { id }, data });
}

export async function deleteGoal(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return false;
  await prisma.goal.delete({ where: { id } });
  return true;
}

// --- Progress Recalculation ---
export async function recalcGoalsForUser(userId: string) {
  const now = new Date();
  const goals = await prisma.goal.findMany({ where: { userId, startDate: { lte: now }, endDate: { gte: now } } });
  if (!goals.length) return 0;
  // Preload aggregates once
  const trades = await prisma.trade.findMany({ where: { userId, deletedAt: null }, include: { instrument: { select: { contractMultiplier: true } } } });
  type TradeRec = typeof trades[number];
  const closedTrades: TradeRec[] = trades.filter((t: TradeRec) => t.status === 'CLOSED' && t.exitPrice != null);
  const tradePnls = closedTrades.map((t: TradeRec) => {
    if (t.exitPrice == null) return 0;
    const sign = t.direction === 'LONG' ? 1 : -1;
    const multiplier = t.instrument?.contractMultiplier ?? 1;
    return (t.exitPrice - t.entryPrice) * sign * t.quantity * multiplier - (t.fees || 0);
  });
  const totalPnl = tradePnls.reduce((a,b)=>a+b,0);
  const wins = tradePnls.filter(p=>p>0);
  const losses = tradePnls.filter(p=>p<0);
  const winRate = closedTrades.length ? wins.length / closedTrades.length : 0;
  const grossProfit = wins.reduce((a,b)=>a+b,0);
  const grossLoss = Math.abs(losses.reduce((a,b)=>a+b,0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a,b)=>a+b,0)) / losses.length : 0;
  const expectancy = closedTrades.length ? (winRate * avgWin) - ((1 - winRate) * avgLoss) : 0;
  const avgLossCapCurrent = avgLoss; // we measure actual avg loss; goal target is max allowed loss size
  // Rolling window PnL computations (30d default; dynamic windows cached by map days->value)
  const nowTs = Date.now();
  const rollingCache = new Map<number, number>();
  function computeRolling(days: number) {
    if (rollingCache.has(days)) return rollingCache.get(days)!;
    const cutoff = nowTs - days*86400000;
    const sum = closedTrades.filter(t=> t.exitAt && t.exitAt.getTime() >= cutoff).map(t=>{
      if (t.exitPrice == null) return 0;
      const sign = t.direction === 'LONG' ? 1 : -1;
      const multiplier = t.instrument?.contractMultiplier ?? 1;
      return (t.exitPrice - t.entryPrice) * sign * t.quantity * multiplier - (t.fees || 0);
    }).reduce((a,b)=>a+b,0);
    rollingCache.set(days, sum); return sum;
  }
  const rolling30 = computeRolling(30);
  // Compute current daily green streak (consecutive profitable calendar days ending today)
  const pnlByDay: Record<string, number> = {};
  for (const t of closedTrades) {
    if (t.exitPrice == null) continue;
    const dayKey = t.exitAt ? new Date(t.exitAt).toISOString().substring(0,10) : new Date().toISOString().substring(0,10);
    const sign = t.direction === 'LONG' ? 1 : -1;
    const multiplier = t.instrument?.contractMultiplier ?? 1;
    const pnl = (t.exitPrice - t.entryPrice) * sign * t.quantity * multiplier - (t.fees || 0);
    pnlByDay[dayKey] = (pnlByDay[dayKey] || 0) + pnl;
  }
  const today = new Date();
  let streak = 0;
  for (let i=0; i<180; i++) { // cap lookback
    const d = new Date(today.getTime() - i*86400000);
    const key = d.toISOString().substring(0,10);
    if (!(key in pnlByDay)) {
      if (i===0) { // if no trades today we allow continuing if previous day positive? choose to break
        break;
      }
      break;
    }
    if (pnlByDay[key] > 0) streak++;
    else break;
  }
  let updates = 0;
  for (const g of goals) {
    let currentValue: number | null = null;
    if (g.type === 'TOTAL_PNL') currentValue = totalPnl;
    else if (g.type === 'TRADE_COUNT') currentValue = trades.length;
    else if (g.type === 'WIN_RATE') currentValue = winRate * 100; // percentage
    else if (g.type === 'PROFIT_FACTOR') currentValue = profitFactor === Infinity ? g.targetValue : profitFactor; // if infinite treat as achieved (capped to target)
    else if (g.type === 'EXPECTANCY') currentValue = expectancy;
    else if (g.type === 'AVG_LOSS_CAP') {
      // For loss cap, progress is inverse: we want avg loss <= target. Represent currentValue as avgLoss; achieved when avgLoss <= target.
      currentValue = avgLossCapCurrent;
    } else if (g.type === 'DAILY_GREEN_STREAK') {
      currentValue = streak;
    } else if (g.type === 'ROLLING_30D_PNL') {
      currentValue = rolling30;
    } else if (g.type === 'ROLLING_WINDOW_PNL') {
      const windowDays = g.windowDays || 30;
      currentValue = computeRolling(windowDays);
    }
    if (currentValue == null) continue;
    let achievedAt: Date | null | undefined = g.achievedAt;
    if (g.type === 'AVG_LOSS_CAP') {
      if (currentValue <= g.targetValue && !g.achievedAt) achievedAt = new Date();
    } else if (g.type === 'DAILY_GREEN_STREAK') {
      if (currentValue >= g.targetValue && !g.achievedAt) achievedAt = new Date();
    } else {
      if (currentValue >= g.targetValue && !g.achievedAt) achievedAt = new Date();
    }
    await prisma.goal.update({ where: { id: g.id }, data: { currentValue, achievedAt } });
    updates++;
  }
  return updates;
}

// Simple per-user debounce so a burst of trade mutations only triggers one heavy aggregate.
const goalRecalcTimers: Map<string, NodeJS.Timeout> = new Map();
const GOAL_RECALC_DEBOUNCE_MS = 500; // fast feedback but reduces thrash

export function scheduleGoalRecalc(userId: string) {
  const existing = goalRecalcTimers.get(userId);
  if (existing) clearTimeout(existing);
  const handle = setTimeout(() => {
    goalRecalcTimers.delete(userId);
    recalcGoalsForUser(userId).catch(() => {});
  }, GOAL_RECALC_DEBOUNCE_MS);
  goalRecalcTimers.set(userId, handle);
}

export async function recalcGoalsForTradeMutation(userId: string) {
  // kept for backward compatibility; now just schedules
  scheduleGoalRecalc(userId);
}
