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
  const multiplier = trade.contractMultiplier ?? 1;
  return diff * trade.quantity * multiplier - trade.fees;
}

export function aggregateStats(trades: TradeLike[]) {
  const closed = trades.filter(t => t.exitPrice != null);
  const pnls = closed.map(calcPnL).filter((v): v is number => v != null);
  const total = pnls.reduce((a,b)=>a+b,0);
  const wins = pnls.filter(p=>p>0).length;
  const losses = pnls.filter(p=>p<0).length;
  const winRate = pnls.length ? wins / pnls.length : 0;
  const avgWin = wins ? pnls.filter(p=>p>0).reduce((a,b)=>a+b,0)/wins : 0;
  const avgLoss = losses ? Math.abs(pnls.filter(p=>p<0).reduce((a,b)=>a+b,0))/losses : 0;
  return { total, winRate, avgWin, avgLoss, trades: pnls.length };
}
