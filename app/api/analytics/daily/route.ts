import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';
import { ResponseEnvelope, DailyPnlPayload } from '@/types/api';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';

// Aggregates realized P/L per day (UTC) for closed trades within an optional lookback window (default 60 days)
async function _GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  const userId = user?.id;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() } as ResponseEnvelope<DailyPnlPayload>), { status: 401 });
  try {
    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const days = Math.min(180, Math.max(1, daysParam ? parseInt(daysParam, 10) : 60));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cacheKey = `daily:${days}`;
  const cached = getAnalyticsCache(userId, cacheKey) as DailyPnlPayload | null;
  if (cached) return new Response(JSON.stringify({ data: cached, error: null } as ResponseEnvelope<DailyPnlPayload>), { status: 200 });
  const trades = await prisma.trade.findMany({
      where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null, gte: since } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    const daily: Record<string, number> = {};
    for (const t of trades) {
      if (!t.exitAt) continue;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
      if (pnl == null) continue;
      const dateKey = t.exitAt.toISOString().slice(0, 10); // YYYY-MM-DD
      daily[dateKey] = (daily[dateKey] || 0) + pnl;
    }
    const daysArr = Object.entries(daily).sort((a,b) => a[0].localeCompare(b[0])).map(([date, pnl]) => ({ date, pnl: +pnl.toFixed(2) }));
  const payload: DailyPnlPayload = { days: daysArr };
  setAnalyticsCache(userId, cacheKey, payload, 60_000);
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/daily');
