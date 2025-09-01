import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';

// Provides win/loss/breakeven counts and a simple PnL histogram for closed trades
async function _GET() {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(user.id, 'distribution');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({
      where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null } },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    const pnls: number[] = [];
    let wins = 0, losses = 0, breakeven = 0;
    for (const t of trades) {
  const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
      if (pnl == null) continue;
      pnls.push(pnl);
      if (Math.abs(pnl) < 1e-8) breakeven++; else if (pnl > 0) wins++; else losses++;
    }
    const winRate = pnls.length ? wins / pnls.length : 0;
    // histogram buckets (up to 10) using min/max
    let buckets: { from: number; to: number; count: number }[] = [];
    if (pnls.length) {
      const min = Math.min(...pnls);
      const max = Math.max(...pnls);
      if (min === max) {
        buckets = [{ from: min, to: max, count: pnls.length }];
      } else {
        const k = Math.min(10, Math.ceil(Math.log2(pnls.length) + 1)); // Sturges approximation capped at 10
        const width = (max - min) / k;
        const arr = Array.from({ length: k }, (_, i) => ({ from: min + i * width, to: i === k - 1 ? max : min + (i + 1) * width, count: 0 }));
        for (const v of pnls) {
          let idx = Math.floor((v - min) / width);
            if (idx >= k) idx = k - 1;
          arr[idx].count++;
        }
        buckets = arr.map(b => ({ from: +b.from.toFixed(2), to: +b.to.toFixed(2), count: b.count }));
      }
    }
  const payload = { wins, losses, breakeven, winRate, buckets };
  setAnalyticsCache(user.id, 'distribution', payload, 30_000);
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/distribution');
