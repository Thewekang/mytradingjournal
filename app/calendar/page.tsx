import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import type { Metadata } from 'next';
import CalendarClient from './page.client';

export const metadata: Metadata = {
  title: 'Calendar • Trading Journal',
  description: 'Calendar view of your trading performance with daily P/L overview.'
};

interface DailyData {
  date: string;
  pnl: number;
  tradeCount: number;
}

interface Trade {
  id: string;
  instrumentId: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: string;
  entryAt: string;
  exitAt?: string;
  realizedPnl?: number;
  tags: Array<{ id: string; label: string; color: string }>;
}

async function fetchCalendarData(year: number, month: number): Promise<{
  dailyData: DailyData[];
  trades: Trade[];
  year: number;
  month: number;
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  try {
    // Fetch trades for the month
    const trades = await prisma.trade.findMany({
      where: {
        deletedAt: null,
        entryAt: {
          gte: startDate,
          lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1) // End of day
        }
      },
      select: {
        id: true,
        instrumentId: true,
        direction: true,
        entryPrice: true,
        exitPrice: true,
        quantity: true,
        status: true,
        entryAt: true,
        exitAt: true,
        fees: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                label: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: { entryAt: 'desc' }
    });

    // Group trades by date and calculate daily P/L
    const dailyMap = new Map<string, { pnl: number; tradeCount: number }>();
    
    const formattedTrades: Trade[] = trades.map(trade => {
      const realizedPnl = computeRealizedPnl({
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        direction: trade.direction,
        fees: trade.fees
      });

      const dateKey = trade.entryAt.toISOString().split('T')[0];
      const current = dailyMap.get(dateKey) || { pnl: 0, tradeCount: 0 };
      
      current.tradeCount++;
      if (realizedPnl !== null) {
        current.pnl += realizedPnl;
      }
      
      dailyMap.set(dateKey, current);

      return {
        id: trade.id,
        instrumentId: trade.instrumentId,
        direction: trade.direction as 'LONG' | 'SHORT',
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice || undefined,
        quantity: trade.quantity,
        status: trade.status,
        entryAt: trade.entryAt.toISOString(),
        exitAt: trade.exitAt?.toISOString(),
        realizedPnl: realizedPnl || undefined,
        tags: trade.tags.map(t => t.tag)
      };
    });

    // Convert to array format expected by client
    const dailyData: DailyData[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      tradeCount: data.tradeCount
    }));

    return {
      dailyData,
      trades: formattedTrades,
      year,
      month
    };
  } catch (error) {
    console.error('Failed to fetch calendar data:', error);
    return { dailyData: [], trades: [], year, month };
  }
}

interface CalendarPageProps {
  searchParams?: Promise<Record<string, string | undefined>>;
}

export default async function CalendarPage(props: CalendarPageProps) {
  const user = await requireUser();
  if (!user) {
    return <div className="text-center py-20">Please sign in to view your calendar.</div>;
  }

  const raw = props.searchParams ? await props.searchParams : {};
  const currentDate = new Date();
  const targetYear = raw.year ? parseInt(raw.year, 10) : currentDate.getFullYear();
  const targetMonth = raw.month ? parseInt(raw.month, 10) : currentDate.getMonth() + 1;

  const data = await fetchCalendarData(targetYear, targetMonth);

  return <CalendarClient initialData={data} />;
}
