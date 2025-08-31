import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';

interface DrawdownPoint { equity: number; peak: number; dd: number; time: string; tradeId: string }

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(userId, 'drawdown');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({
      where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } },
      orderBy: { exitAt: 'asc' },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    let equity = 0; let peak = 0; let maxDrawdown = 0; let maxDrawdownPct = 0; let troughEquity = 0; let peakTime: string | null = null; let troughTime: string | null = null;
    const timeline: DrawdownPoint[] = [];
    for (const t of trades) {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: (t as any).instrument?.contractMultiplier }) || 0;
      equity += pnl;
      if (equity > peak) { peak = equity; peakTime = t.exitAt!.toISOString(); }
      const dd = peak - equity; // absolute drawdown
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        troughEquity = equity;
        troughTime = t.exitAt!.toISOString();
        maxDrawdownPct = peak !== 0 ? dd / peak : 0;
      }
      timeline.push({ equity: +equity.toFixed(2), peak: +peak.toFixed(2), dd: +dd.toFixed(2), time: t.exitAt!.toISOString(), tradeId: t.id });
    }
  const payload = { maxDrawdown: +maxDrawdown.toFixed(2), maxDrawdownPct: + (maxDrawdownPct*100).toFixed(2), peakTime, troughTime, troughEquity: +troughEquity.toFixed(2), timeline };
  setAnalyticsCache(userId, 'drawdown', payload, 60_000);
  return new Response(JSON.stringify({ data: payload, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
