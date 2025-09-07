export const dynamicParams = false;
export const revalidate = 0;

import PrintDashboard from '@/components/reports/print-dashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';

type Filters = { from?: string; to?: string; tagIds?: string[] };

function parseFilters(searchParams?: Record<string, string | string[] | undefined>): Filters {
  const from = typeof searchParams?.from === 'string' ? searchParams?.from : undefined;
  const to = typeof searchParams?.to === 'string' ? searchParams?.to : undefined;
  const tagParam = searchParams?.tagId;
  const tagIds = Array.isArray(tagParam) ? tagParam.filter(Boolean) as string[] : (typeof tagParam === 'string' ? [tagParam] : []);
  return { from, to, tagIds: tagIds.length ? tagIds : undefined };
}

type WhereWithExitAt = {
  userId: string;
  status: 'CLOSED';
  deletedAt: null;
  exitAt: { not: null; gte?: Date; lte?: Date };
  tags?: { some: { tagId: { in: string[] } } };
};

async function fetchSummary(userId: string, filters: Filters) {
  // Reuse logic from /api/analytics/summary without invoking HTTP
  const where: WhereWithExitAt = { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } };
  if (filters.from) where.exitAt.gte = new Date(filters.from);
  if (filters.to) where.exitAt.lte = new Date(filters.to);
  if (filters.tagIds?.length) where.tags = { some: { tagId: { in: filters.tagIds } } };
  const trades = await prisma.trade.findMany({ where, include: { instrument: { select: { contractMultiplier: true } } } });
  let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0, totalPL = 0;
  const pnls: number[] = [];
  for (const t of trades) {
    const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined });
    if (pnl == null) continue;
    pnls.push(pnl);
    totalPL += pnl;
    if (pnl >= 0) { wins++; grossProfit += pnl; } else { losses++; grossLoss += Math.abs(pnl); }
  }
  const winRate = pnls.length ? wins / pnls.length : 0;
  const avgWin = wins ? grossProfit / wins : 0;
  const avgLoss = losses ? grossLoss / losses : 0;
  const expectancy = (avgWin * winRate) - (avgLoss * (1 - winRate));
  return { totalPL: +totalPL.toFixed(2), winRate, expectancy: +expectancy.toFixed(2) };
}

async function fetchEquity(userId: string, filters: Filters) {
  const where: WhereWithExitAt = { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } };
  if (filters.from) where.exitAt.gte = new Date(filters.from);
  if (filters.to) where.exitAt.lte = new Date(filters.to);
  if (filters.tagIds?.length) where.tags = { some: { tagId: { in: filters.tagIds } } };
  const trades = await prisma.trade.findMany({
    where,
    orderBy: { exitAt: 'asc' },
    include: { instrument: { select: { contractMultiplier: true } } }
  });
  let equity = 0;
  const points = trades.map(t => {
    const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier ?? undefined }) || 0;
    equity += pnl;
    const date = t.exitAt ? t.exitAt.toISOString().slice(0,10) : '';
    return { date, equity: +equity.toFixed(2) };
  });
  return points;
}

type WhereRecent = {
  userId: string;
  deletedAt: null;
  entryAt?: { gte?: Date; lte?: Date };
  tags?: { some: { tagId: { in: string[] } } };
};

async function fetchRecentTrades(userId: string, filters: Filters) {
  const where: WhereRecent = { userId, deletedAt: null };
  if (filters.from || filters.to) where.entryAt = {};
  if (filters.from) where.entryAt!.gte = new Date(filters.from);
  if (filters.to) where.entryAt!.lte = new Date(filters.to);
  if (filters.tagIds?.length) where.tags = { some: { tagId: { in: filters.tagIds } } };
  const rows = await prisma.trade.findMany({
    where,
    orderBy: { entryAt: 'desc' },
    take: 15,
    include: { instrument: true }
  });
  return rows.map(r => ({
    date: r.entryAt.toISOString().slice(0,10),
    instrument: r.instrument.symbol,
    direction: r.direction as 'LONG' | 'SHORT',
    qty: r.quantity,
    entry: r.entryPrice,
    exit: r.exitPrice ?? null,
    pnl: r.exitAt ? computeRealizedPnl({ entryPrice: r.entryPrice, exitPrice: r.exitPrice ?? undefined, quantity: r.quantity, direction: r.direction, fees: r.fees, contractMultiplier: r.instrument.contractMultiplier ?? undefined }) : null,
  }));
}

export default async function ReportDashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const sp = searchParams ? await searchParams : undefined;
  const filters = parseFilters(sp);
  let props;
  if (userId) {
    const [summary, equity, trades] = await Promise.all([
      fetchSummary(userId, filters),
      fetchEquity(userId, filters),
      fetchRecentTrades(userId, filters)
    ]);
    props = { summary, equity, trades };
  } else {
    // Fallback preview for unauthenticated (keeps experimental PDF demo working)
    props = {
      summary: { totalPL: 0, winRate: 0, expectancy: 0 },
      equity: [],
      trades: []
    };
  }
  return (
    <main style={{ padding: 16 }}>
      <PrintDashboard {...props} />
    </main>
  );
}
