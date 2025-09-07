import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { cached } from '@/lib/api/cache-wrapper';
import { getFxRate, convertAmount } from '@/lib/services/fx-service';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _GET(_request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const payload = await cached(user.id, 'tag-performance', 120_000, async () => {
    const links = await prisma.tradeTagOnTrade.findMany({
      where: { trade: { userId: user.id, status: 'CLOSED', deletedAt: null, exitAt: { not: null } } },
      include: { tag: true, trade: { include: { instrument: { select: { contractMultiplier: true, currency: true } } } } }
    });
    const settings = await prisma.journalSettings.findUnique({ where: { userId: user.id } });
    const ENABLE_FX = process.env.ENABLE_FX_CONVERSION === '1';
    const map: Record<string, { tagId: string; label: string; color: string; trades: number; wins: number; losses: number; sumPnl: number; }> = {};
    for (const l of links) {
  const t = l.trade;
  const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
      if (pnl == null) continue;
  const base = settings?.baseCurrency || 'USD';
  const quote = t.instrument?.currency || base;
  const rate = ENABLE_FX ? await getFxRate((t.exitAt as Date).toISOString().slice(0,10), quote, base) : null;
  const pnlConv = convertAmount(pnl, rate);
      const bucket = map[l.tagId] || (map[l.tagId] = { tagId: l.tagId, label: l.tag.label, color: l.tag.color, trades: 0, wins: 0, losses: 0, sumPnl: 0 });
  bucket.trades += 1;
  if (pnlConv >= 0) bucket.wins += 1; else bucket.losses += 1;
  bucket.sumPnl += pnlConv;
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
    return { tags: data };
  });
  return jsonOk(payload);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const GET = withLogging(_GET, 'GET /api/analytics/tag-performance');
