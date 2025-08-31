import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(userId, 'tag-performance');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const links = await prisma.tradeTagOnTrade.findMany({
      where: { trade: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } } },
      include: { tag: true, trade: { include: { instrument: { select: { contractMultiplier: true } } } } }
    });
    const map: Record<string, { tagId: string; label: string; color: string; trades: number; wins: number; losses: number; sumPnl: number; }> = {};
    for (const l of links) {
      const t = l.trade;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: (t as any).instrument?.contractMultiplier });
      if (pnl == null) continue;
      const bucket = map[l.tagId] || (map[l.tagId] = { tagId: l.tagId, label: l.tag.label, color: l.tag.color, trades: 0, wins: 0, losses: 0, sumPnl: 0 });
      bucket.trades += 1;
      if (pnl >= 0) bucket.wins += 1; else bucket.losses += 1;
      bucket.sumPnl += pnl;
    }
    const data = Object.values(map).map(r => ({
      tagId: r.tagId,
      label: r.label,
      color: r.color,
      trades: r.trades,
      wins: r.wins,
      losses: r.losses,
      winRate: r.trades ? r.wins / r.trades : 0,
      sumPnl: +r.sumPnl.toFixed(2),
      avgPnl: r.trades ? +(r.sumPnl / r.trades).toFixed(2) : 0
    })).sort((a,b)=>Math.abs(b.sumPnl)-Math.abs(a.sumPnl)).slice(0,50);
  const payload = { tags: data };
  setAnalyticsCache(userId, 'tag-performance', payload, 120_000);
  return new Response(JSON.stringify({ data: payload, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
