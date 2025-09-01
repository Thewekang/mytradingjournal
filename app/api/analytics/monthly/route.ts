import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';

// Aggregates realized P/L per calendar month (UTC) for closed trades, default 12 months lookback
async function _GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
    const url = new URL(request.url);
    const monthsParam = url.searchParams.get('months');
    const months = Math.min(36, Math.max(1, monthsParam ? parseInt(monthsParam, 10) : 12));
    const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months - 1), 1));
  const cacheKey = `monthly:${months}`;
  const cached = getAnalyticsCache(user.id, cacheKey);
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({
      where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null, gte: since } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    const monthly: Record<string, number> = {};
    for (const t of trades) {
      if (!t.exitAt) continue;
  const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
      if (pnl == null) continue;
      const dt = t.exitAt;
      const key = dt.toISOString().slice(0,7); // YYYY-MM
      monthly[key] = (monthly[key] || 0) + pnl;
    }
    const data = Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0])).map(([month, pnl]) => ({ month, pnl: +pnl.toFixed(2) }));
  const payload = { months: data };
  setAnalyticsCache(user.id, cacheKey, payload, 120_000);
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/monthly');
