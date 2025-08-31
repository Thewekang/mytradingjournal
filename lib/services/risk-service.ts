// Lightweight Risk Engine scaffold
// Computes simple guardrails after each trade mutation.
// Future expansion: persist daily risk breaches, block new trades, notifications.
import { prisma } from '@/lib/prisma';

// Suppress duplicate breach log entries for same type within this many minutes
const BREACH_SUPPRESSION_MINUTES = 30; // future: move to settings if user-configurable

export interface RiskBreach {
  type: 'DAILY_LOSS' | 'MAX_CONSECUTIVE_LOSSES';
  message: string;
  value: number;
  limit: number;
}

// Utility to compute realized PnL for a list of trades
function calcRealizedPnl(trades: { exitPrice: number | null; entryPrice: number; direction: string; quantity: number; fees: number; instrument?: { contractMultiplier: number | null } }[]): number {
  return trades.reduce((sum, t) => {
    if (t.exitPrice == null) return sum;
    const sign = t.direction === 'LONG' ? 1 : -1;
    const mult = t.instrument?.contractMultiplier ?? 1;
    const pnl = (t.exitPrice - t.entryPrice) * sign * t.quantity * mult - (t.fees || 0);
    return sum + pnl;
  }, 0);
}

export async function evaluateRiskForUser(userId: string): Promise<RiskBreach[]> {
  const settings = await prisma.journalSettings.findUnique({ where: { userId } });
  if (!settings) return [];
  const breaches: RiskBreach[] = [];
  const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
  // Today's closed trades
  const todaysTrades = await prisma.trade.findMany({ where: { userId, deletedAt: null, entryAt: { gte: todayStart }, status: 'CLOSED' }, include: { instrument: { select: { contractMultiplier: true } } } });
  // Historical closed trades before today for equity baseline
  const historicalClosed = await prisma.trade.findMany({ where: { userId, deletedAt: null, status: 'CLOSED', entryAt: { lt: todayStart } }, include: { instrument: { select: { contractMultiplier: true } } } });
  const historicalPnl = calcRealizedPnl(historicalClosed);
  const todayRealized = calcRealizedPnl(todaysTrades);
  const equityBase = settings.initialEquity + historicalPnl; // dynamic baseline
  const dailyLossPct = todayRealized < 0 ? Math.abs(todayRealized) / (equityBase || 1) * 100 : 0;
  if (dailyLossPct > settings.maxDailyLossPct) {
    breaches.push({ type: 'DAILY_LOSS', message: `Daily loss ${dailyLossPct.toFixed(2)}% exceeded limit ${settings.maxDailyLossPct}%`, value: dailyLossPct, limit: settings.maxDailyLossPct });
  }
  // consecutive loss streak today
  type TradeRec = typeof todaysTrades[number];
  const ordered = todaysTrades
    .filter((t: TradeRec) => t.exitPrice != null)
    .sort((a: TradeRec, b: TradeRec) => (a.exitAt?.getTime() || 0) - (b.exitAt?.getTime() || 0));
  let currentLossStreak = 0; let maxLossStreak = 0;
  for (const t of ordered) {
    const sign = t.direction === 'LONG' ? 1 : -1;
    const mult = t.instrument?.contractMultiplier ?? 1;
    const pnl = (t.exitPrice! - t.entryPrice) * sign * t.quantity * mult - (t.fees||0);
    if (pnl < 0) { currentLossStreak++; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); } else { currentLossStreak = 0; }
  }
  const lossStreakLimit = settings.maxConsecutiveLossesThreshold || 5;
  if (maxLossStreak >= lossStreakLimit) {
    breaches.push({ type: 'MAX_CONSECUTIVE_LOSSES', message: `Loss streak reached ${maxLossStreak}`, value: maxLossStreak, limit: lossStreakLimit });
  }
  if (breaches.length) {
    const suppressionThreshold = new Date(Date.now() - BREACH_SUPPRESSION_MINUTES * 60 * 1000);
    for (const b of breaches) {
      // find most recent log for this type today
      const last = await prisma.riskBreachLog.findFirst({
        where: { userId, type: b.type, createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });
      if (!last || last.createdAt < suppressionThreshold) {
        await prisma.riskBreachLog.create({ data: { userId, type: b.type, message: b.message, value: b.value, limit: b.limit } });
      }
    }
  }
  return breaches;
}

// Fire-and-forget evaluation used by trade mutations
export function scheduleRiskEvaluation(userId: string) {
  evaluateRiskForUser(userId).catch(()=>{});
}

// Hard breach types list (blocking trade creation)
const HARD_BREACH_TYPES: RiskBreach['type'][] = ['DAILY_LOSS'];

export async function hasActiveHardBreach(userId: string): Promise<boolean> {
  const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
  const count = await prisma.riskBreachLog.count({ where: { userId, type: { in: HARD_BREACH_TYPES }, createdAt: { gte: todayStart } } });
  return count > 0;
}