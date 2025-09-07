// Local lightweight type (avoids coupling to Prisma enum for pure analytics layer)
export type TradeDirection = 'LONG' | 'SHORT';

export interface TradeLike {
  entryPrice: number;
  exitPrice?: number | null;
  quantity: number; // contracts / shares
  fees: number;
  direction: TradeDirection;
  contractMultiplier?: number | null;
}

export function calcPnL(trade: TradeLike): number | null {
  if (trade.exitPrice == null) return null;
  const diff = trade.direction === 'LONG' ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice;
  const multiplier = trade.contractMultiplier && trade.contractMultiplier > 0 ? trade.contractMultiplier : 1;
  return diff * trade.quantity * multiplier - trade.fees;
}

interface TimedTradeLike extends TradeLike { entryAt?: Date; exitAt?: Date }

export function aggregateStats(trades: (TradeLike | TimedTradeLike)[]) {
  const closed = (trades as TimedTradeLike[]).filter(t => t.exitPrice != null);
  const pnls = closed.map(calcPnL).filter((v): v is number => v != null);
  const total = pnls.reduce((a,b)=>a+b,0);
  const wins = pnls.filter(p=>p>0).length;
  const losses = pnls.filter(p=>p<0).length;
  const winRate = pnls.length ? wins / pnls.length : 0;
  const avgWin = wins ? pnls.filter(p=>p>0).reduce((a,b)=>a+b,0)/wins : 0;
  const avgLoss = losses ? Math.abs(pnls.filter(p=>p<0).reduce((a,b)=>a+b,0))/losses : 0;
  // Avg hold time (in minutes) for closed trades when both prices present
  const holdDurationsMs = closed
    .map(t => t.entryAt && t.exitAt ? t.exitAt.getTime() - t.entryAt.getTime() : null)
    .filter((v): v is number => v != null && v >= 0);
  const avgHoldMinutes = holdDurationsMs.length ? (holdDurationsMs.reduce((a,b)=>a+b,0)/holdDurationsMs.length)/60000 : 0;
  // Daily variance: group PnL by day (UTC) and compute variance of daily totals
  const dailyMap: Record<string, number> = {};
  closed.forEach(t => {
    if (t.exitAt && t.exitPrice != null) {
      const pnl = calcPnL(t);
      if (pnl != null) {
        const day = t.exitAt.toISOString().slice(0,10);
        dailyMap[day] = (dailyMap[day] || 0) + pnl;
      }
    }
  });
  const dailyValues = Object.values(dailyMap);
  const dailyMean = dailyValues.length ? dailyValues.reduce((a,b)=>a+b,0)/dailyValues.length : 0;
  const dailyVariance = dailyValues.length ? dailyValues.reduce((a,b)=> a + Math.pow(b - dailyMean,2), 0) / dailyValues.length : 0;
  return { total, winRate, avgWin, avgLoss, trades: pnls.length, avgHoldMinutes, dailyVariance };
}
