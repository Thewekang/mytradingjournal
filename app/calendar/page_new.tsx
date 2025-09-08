import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import type { Metadata } from 'next';
import CalendarClient from './page.client';

export const metadata: Metadata = {
  title: 'Calendar • Trading Journal',
  description: 'Monthly calendar view of your trading performance with daily P/L tracking.'
};

async function fetchCalendarData(userId: string, year?: number, month?: number) {
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth() + 1;
  
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0);
  
  try {
    // Fetch closed trades for the month directly from database
    const trades = await prisma.trade.findMany({
      where: { 
        userId, 
        status: 'CLOSED', 
        deletedAt: null, 
        exitAt: { 
          not: null, 
          gte: startDate,
          lte: endDate
        } 
      },
      orderBy: { exitAt: 'asc' },
      include: { 
        instrument: { select: { contractMultiplier: true, currency: true } },
        tags: { include: { tag: true } }
      }
    });

    // Group trades by date and compute daily P/L
    const dailyData: Array<{ date: string; pnl: number; tradeCount: number }> = [];
    const dailyMap = new Map<string, { pnl: number; count: number }>();

    for (const trade of trades) {
      if (!trade.exitAt) continue;
      
      const dateKey = trade.exitAt.toISOString().split('T')[0];
      const pnl = computeRealizedPnl(trade) || 0; // Handle null case
      
      const existing = dailyMap.get(dateKey) || { pnl: 0, count: 0 };
      dailyMap.set(dateKey, { 
        pnl: existing.pnl + pnl, 
        count: existing.count + 1 
      });
    }

    // Convert map to array
    for (const [date, { pnl, count }] of dailyMap.entries()) {
      dailyData.push({ date, pnl, tradeCount: count });
    }

    return { 
      dailyData: dailyData.sort((a, b) => a.date.localeCompare(b.date)), 
      trades, 
      year: targetYear, 
      month: targetMonth 
    };
  } catch (error) {
    console.error('Failed to fetch calendar data:', error);
    return { 
      dailyData: [], 
      trades: [], 
      year: targetYear, 
      month: targetMonth 
    };
  }
}

interface CalendarPageProps {
  searchParams?: Promise<{ year?: string; month?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireUser();
  if (!user) {
    return <div className="text-center py-20">Please sign in to view your calendar.</div>;
  }

  const params = searchParams ? await searchParams : {};
  const year = params.year ? parseInt(params.year) : undefined;
  const month = params.month ? parseInt(params.month) : undefined;

  const data = await fetchCalendarData(user.id!, year, month);

  return <CalendarClient initialData={data} />;
}
