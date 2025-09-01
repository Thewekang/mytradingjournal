import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';

async function _GET() {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(user.id, 'summary');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null } }, include: { instrument: { select: { contractMultiplier: true } } } });
  let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
  let currentConsecutiveLosses = 0, maxConsecutiveLosses = 0;
  const pnls: number[] = [];
    for (const t of trades) {
  const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
      if (pnl == null) continue;
      pnls.push(pnl);
  if (pnl >= 0) { wins++; grossProfit += pnl; currentConsecutiveLosses = 0; } else { losses++; grossLoss += Math.abs(pnl); currentConsecutiveLosses++; if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses; }
    }
    const winRate = pnls.length ? wins / pnls.length : 0;
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const expectancy = (avgWin * winRate) - (avgLoss * (1 - winRate));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const payload = { winRate, avgWin, avgLoss, expectancy, profitFactor, currentConsecutiveLosses, maxConsecutiveLosses };
  setAnalyticsCache(user.id, 'summary', payload, 30_000);
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/summary');