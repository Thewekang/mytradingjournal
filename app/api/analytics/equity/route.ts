import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';

// Returns simple cumulative equity curve points based on closed trades' realized PnL ordered by exitAt
async function _GET() {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(user.id, 'equity');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({
    where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    let equity = 0;
  const points = trades.map((t: { id: string; exitAt: Date | null; entryPrice: number; exitPrice: number | null; quantity: number; direction: 'LONG' | 'SHORT'; fees: number; instrument: { contractMultiplier: number | null } | null }): { time: Date | null; equity: number; tradeId: string; pnl: number } => {
    const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined }) || 0;
      equity += pnl;
      return { time: t.exitAt, equity: +equity.toFixed(2), tradeId: t.id, pnl: pnl };
    });
  const payload = { points };
  setAnalyticsCache(user.id, 'equity', payload, 30_000); // 30s TTL for equity curve
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/equity');
