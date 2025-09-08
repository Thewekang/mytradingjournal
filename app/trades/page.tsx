import { requireUser } from '../../lib/auth';
import type { Metadata } from 'next';
import { TradesClient } from './trades-client';
import { listTrades } from '@/lib/services/trade-service';

export const metadata: Metadata = {
  title: 'Trades • Trading Journal',
  description: 'Browse, filter, and manage recorded trades.'
};

interface TradeListFilters {
  instrumentId?: string;
  direction?: 'LONG' | 'SHORT';
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED';
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  cursor?: string;
  limit?: number;
  tagIds?: string[];
}

async function fetchTrades(userId: string, filters: TradeListFilters) {
  try {
    const result = await listTrades(userId, filters);
    return {
      items: result.items.map(t => ({
        id: t.id,
        instrumentId: t.instrumentId,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        quantity: t.quantity,
        status: t.status,
        entryAt: t.entryAt.toISOString(),
        exitAt: t.exitAt ? t.exitAt.toISOString() : null,
        realizedPnl: t.realizedPnl ?? null,
        notes: t.notes,
        reason: t.reason,
        lesson: t.lesson,
        tags: t.tags.map(tt => ({ tagId: tt.tag.id, tag: { id: tt.tag.id, label: tt.tag.label, color: tt.tag.color } }))
      })),
      nextCursor: result.nextCursor
    };
  } catch (error) {
    console.error('Failed to fetch trades:', error);
    return { items: [], nextCursor: null };
  }
}

// Next.js App Router passes `searchParams` possibly as a Promise in some edge cases during type generation (.next/types)
// Conform to Next's generated PageProps expecting an (optional) Promise for searchParams
type TradesPageProps = { searchParams?: Promise<Record<string, string | undefined>> };

export default async function TradesPage(props: TradesPageProps) {
  const raw = props.searchParams ? await props.searchParams : {};
  const user = await requireUser();
  
  if (!user) {
    return <div className="text-center py-20">Please sign in to view your trades.</div>;
  }
  
  // Build filters from search params
  const filters: TradeListFilters = {};
  if (raw?.instrumentId) filters.instrumentId = raw.instrumentId;
  if (raw?.direction && ['LONG', 'SHORT'].includes(raw.direction)) {
    filters.direction = raw.direction as 'LONG' | 'SHORT';
  }
  if (raw?.status && ['OPEN', 'CLOSED', 'CANCELLED'].includes(raw.status)) {
    filters.status = raw.status as 'OPEN' | 'CLOSED' | 'CANCELLED';
  }
  if (raw?.q) filters.q = raw.q;
  if (raw?.cursor) filters.cursor = raw.cursor;
  if (raw?.limit) filters.limit = parseInt(raw.limit, 10);
  
  const data = await fetchTrades(user.id!, filters);
  
  return <TradesClient initial={data} userEmail={user.email} />;
}
