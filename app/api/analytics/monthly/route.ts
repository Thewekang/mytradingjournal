import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { cached } from '@/lib/api/cache-wrapper';
import { runInSpan } from '@/lib/observability';
import { getFxRate, convertAmount } from '@/lib/services/fx-service';

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
  const payload = await cached(user.id, cacheKey, 120_000, async () => await runInSpan('analytics.monthly.fetch', { userId: user.id, months }, async () => {
    const trades = await prisma.trade.findMany({
      where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null, gte: since } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true, currency: true } } }
    });
    const settings = await prisma.journalSettings.findUnique({ where: { userId: user.id } });
    const ENABLE_FX = process.env.ENABLE_FX_CONVERSION === '1';
    const data = await runInSpan('analytics.monthly.compute', { userId: user.id, months }, async () => {
      const monthly: Record<string, number> = {};
      for (const t of trades) {
        if (!t.exitAt) continue;
        const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
        if (pnl == null) continue;
        const base = settings?.baseCurrency || 'USD';
        const quote = t.instrument?.currency || base;
        const rate = ENABLE_FX ? await getFxRate(t.exitAt.toISOString().slice(0,10), quote, base) : null;
        const pnlConv = convertAmount(pnl, rate);
        const dt = t.exitAt;
        const key = dt.toISOString().slice(0,7); // YYYY-MM
        monthly[key] = (monthly[key] || 0) + pnlConv;
      }
      return Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0])).map(([month, pnl]) => ({ month, pnl: +pnl.toFixed(2) }));
    });
    return { months: data };
  }))
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/monthly');
