import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';

// Returns simple cumulative equity curve points based on closed trades' realized PnL ordered by exitAt
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(userId, 'equity');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({
      where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    let equity = 0;
  const points = trades.map((t: any) => {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: (t as any).instrument?.contractMultiplier }) || 0;
      equity += pnl;
      return { time: t.exitAt, equity: +equity.toFixed(2), tradeId: t.id, pnl: pnl };
    });
  const payload = { points };
  setAnalyticsCache(userId, 'equity', payload, 30_000); // 30s TTL for equity curve
  return new Response(JSON.stringify({ data: payload, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
