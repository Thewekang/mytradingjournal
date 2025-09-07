import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { cached } from '@/lib/api/cache-wrapper';

// Returns simple cumulative equity curve points based on closed trades' realized PnL ordered by exitAt
async function _GET() {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const payload = await cached(user.id, 'equity', 30_000, async () => {
    const trades = await prisma.trade.findMany({
      where: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    let equity = 0;
    const points = trades.map(t => {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined }) || 0;
      equity += pnl;
      return { time: t.exitAt, equity: +equity.toFixed(2), tradeId: t.id, pnl };
    });
    return { points };
  });
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/equity');
