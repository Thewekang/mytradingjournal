import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { unauthorized, internal } from '@/lib/errors';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';

// Provides win/loss/breakeven counts and a simple PnL histogram for closed trades
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const cached = getAnalyticsCache(userId, 'distribution');
  if (cached) return new Response(JSON.stringify({ data: cached, error: null }), { status: 200 });
  const trades = await prisma.trade.findMany({
      where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    const pnls: number[] = [];
    let wins = 0, losses = 0, breakeven = 0;
    for (const t of trades) {
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: (t as any).instrument?.contractMultiplier });
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
  setAnalyticsCache(userId, 'distribution', payload, 30_000);
  return new Response(JSON.stringify({ data: payload, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
