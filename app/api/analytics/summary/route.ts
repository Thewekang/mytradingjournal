import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getFxRate, convertAmount } from '@/lib/services/fx-service';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { runInSpan } from '@/lib/observability';
import { cached } from '@/lib/api/cache-wrapper';

async function _GET() {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const payload = await cached(user.id, 'summary', 30_000, async () => await runInSpan('analytics.summary', { userId: user.id }, async () => {
    const trades = await prisma.trade.findMany({ where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null } }, include: { instrument: { select: { contractMultiplier: true, currency: true } } } });
    const settings = await prisma.journalSettings.findUnique({ where: { userId: user.id }, select: { baseCurrency: true } });
    const baseCcy = settings?.baseCurrency || 'USD';
    const fxEnabled = process.env.ENABLE_FX_CONVERSION === '1';
    let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
    let currentConsecutiveLosses = 0, maxConsecutiveLosses = 0;
    const pnls: number[] = [];
    const holdDurationsMs: number[] = [];
    const dailyMap: Record<string, number> = {};
    for (const t of trades) {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
      if (pnl == null) continue;
      let adj = pnl;
      if (fxEnabled && t.exitAt && t.instrument?.currency && baseCcy && t.instrument.currency !== baseCcy) {
        const rate = await getFxRate(t.exitAt.toISOString().slice(0,10), t.instrument.currency, baseCcy);
        adj = convertAmount(pnl, rate);
      }
      pnls.push(adj);
      if (t.entryAt && t.exitAt) {
        const dur = t.exitAt.getTime() - t.entryAt.getTime();
        if (dur >= 0) holdDurationsMs.push(dur);
      }
      if (t.exitAt) {
        const day = t.exitAt.toISOString().slice(0,10);
        dailyMap[day] = (dailyMap[day] || 0) + adj;
      }
      if (adj >= 0) { wins++; grossProfit += adj; currentConsecutiveLosses = 0; } else { losses++; grossLoss += Math.abs(adj); currentConsecutiveLosses++; if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses; }
    }
    const winRate = pnls.length ? wins / pnls.length : 0;
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const expectancy = (avgWin * winRate) - (avgLoss * (1 - winRate));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
    const avgHoldMinutes = holdDurationsMs.length ? (holdDurationsMs.reduce((a,b)=>a+b,0)/holdDurationsMs.length)/60000 : 0;
    const dailyValues = Object.values(dailyMap);
    const dailyMean = dailyValues.length ? dailyValues.reduce((a,b)=>a+b,0)/dailyValues.length : 0;
    const dailyVariance = dailyValues.length ? dailyValues.reduce((a,b)=> a + Math.pow(b - dailyMean,2), 0) / dailyValues.length : 0;
    return { winRate, avgWin, avgLoss, expectancy, profitFactor, currentConsecutiveLosses, maxConsecutiveLosses, avgHoldMinutes, dailyVariance };
  }))
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/summary');