"use client";
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface CalendarData {
  dailyData: DailyData[];
  trades: Trade[];
  year: number;
  month: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarClient({ initialData }: { initialData: CalendarData }) {
  const [data] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { dailyData, trades, year, month } = data;

  // Create lookup map for daily data
  const dailyMap = new Map(dailyData.map(d => [d.date, d]));

  // Filter trades for selected date
  const selectedTrades = selectedDate 
    ? trades.filter(t => t.entryAt.split('T')[0] === selectedDate || t.exitAt?.split('T')[0] === selectedDate)
    : [];

  // Calculate calendar layout
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

  const weeks = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= lastDay || currentDate.getDay() !== 0) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
    if (currentDate.getDay() === 0 && currentDate > lastDay) break;
  }

  const navigateMonth = async (direction: 'prev' | 'next') => {
    setLoading(true);
    const newMonth = direction === 'prev' ? month - 1 : month + 1;
    const newYear = newMonth === 0 ? year - 1 : newMonth === 13 ? year + 1 : year;
    const adjustedMonth = newMonth === 0 ? 12 : newMonth === 13 ? 1 : newMonth;
    
    router.push(`/calendar?year=${newYear}&month=${adjustedMonth}`);
  };

  const getDayData = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dailyMap.get(dateStr);
  };

  const getDayIntensity = (pnl: number, maxPnl: number) => {
    if (maxPnl === 0) return 0.1;
    return Math.min(1, Math.abs(pnl) / maxPnl * 0.8 + 0.2);
  };

  // Calculate max PnL for color intensity
  const maxPnl = Math.max(1, ...dailyData.map(d => Math.abs(d.pnl)));

  const totalPnl = dailyData.reduce((sum, d) => sum + d.pnl, 0);
  const winDays = dailyData.filter(d => d.pnl > 0).length;
  const lossDays = dailyData.filter(d => d.pnl < 0).length;
  const totalTrades = dailyData.reduce((sum, d) => sum + d.tradeCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trading Calendar</h1>
          <p className="text-sm text-[var(--color-muted)]">Daily performance overview</p>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-[var(--color-muted)]">Total P/L</div>
          <div className={`text-lg font-semibold ${totalPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
            RM {totalPnl.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--color-muted)]">Win Rate</div>
          <div className="text-lg font-semibold">
            {winDays + lossDays > 0 ? ((winDays / (winDays + lossDays)) * 100).toFixed(1) : 0}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--color-muted)]">Trading Days</div>
          <div className="text-lg font-semibold">{winDays + lossDays}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--color-muted)]">Total Trades</div>
          <div className="text-lg font-semibold">{totalTrades}</div>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            disabled={loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAY_NAMES.map(day => (
              <div key={day} className="text-center text-sm font-medium text-[var(--color-muted)] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Weeks */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((date, dayIndex) => {
                const isCurrentMonth = date.getMonth() === month - 1;
                const dayData = getDayData(date);
                const dateStr = date.toISOString().split('T')[0];
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                
                return (
                  <Tooltip
                    key={dayIndex}
                    content={dayData 
                      ? `${date.toLocaleDateString()}: RM ${dayData.pnl.toFixed(2)} (${dayData.tradeCount} trades)`
                      : `${date.toLocaleDateString()}: No trades`
                    }
                  >
                    <button
                      className={`
                        h-16 rounded-lg border border-[var(--color-border)] transition-all
                        flex flex-col items-center justify-center text-sm
                        hover:border-[var(--color-border-strong)] focus-ring
                        ${isCurrentMonth ? '' : 'opacity-40'}
                        ${isToday ? 'ring-2 ring-[var(--color-accent)]' : ''}
                        ${selectedDate === dateStr ? 'bg-[var(--color-accent)]/10' : ''}
                      `}
                      style={{
                        backgroundColor: dayData && isCurrentMonth
                          ? dayData.pnl > 0
                            ? `color-mix(in srgb, var(--color-success) ${Math.round(getDayIntensity(dayData.pnl, maxPnl) * 100)}%, transparent)`
                            : dayData.pnl < 0
                              ? `color-mix(in srgb, var(--color-danger) ${Math.round(getDayIntensity(dayData.pnl, maxPnl) * 100)}%, transparent)`
                              : 'var(--color-bg-muted)'
                          : undefined
                      }}
                      onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                    >
                      <span className={`font-medium ${isCurrentMonth ? '' : 'text-[var(--color-muted)]'}`}>
                        {date.getDate()}
                      </span>
                      {dayData && isCurrentMonth && (
                        <div className="flex items-center gap-1 text-xs">
                          {dayData.pnl > 0 ? (
                            <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
                          ) : dayData.pnl < 0 ? (
                            <TrendingDown className="h-3 w-3 text-[var(--color-danger)]" />
                          ) : null}
                          <span className="font-mono">
                            {Math.abs(dayData.pnl) < 100 ? dayData.pnl.toFixed(0) : dayData.pnl.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ 
              background: 'color-mix(in srgb, var(--color-success) 60%, transparent)' 
            }} />
            <span>Profitable Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ 
              background: 'color-mix(in srgb, var(--color-danger) 60%, transparent)' 
            }} />
            <span>Loss Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[var(--color-bg-muted)] border border-[var(--color-border)]" />
            <span>No Trades</span>
          </div>
        </div>
      </Card>

      {/* Day Detail Dialog */}
      {selectedDate && (
        <Dialog
          open={!!selectedDate}
          onOpenChange={(open) => !open && setSelectedDate(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Trades for ${new Date(selectedDate).toLocaleDateString()}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            {selectedTrades.length === 0 ? (
              <p className="text-[var(--color-muted)] text-center py-8">No trades on this day</p>
            ) : (
              <div className="space-y-3">
                {selectedTrades.map(trade => (
                  <Card key={trade.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{trade.instrumentId}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          trade.direction === 'LONG' 
                            ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                            : 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                        }`}>
                          {trade.direction}
                        </span>
                        <span className="text-sm text-[var(--color-muted)]">
                          {trade.quantity} @ {trade.entryPrice}
                        </span>
                      </div>
                      {trade.realizedPnl != null && (
                        <span className={`font-mono text-sm ${
                          trade.realizedPnl >= 0 ? 'pl-positive' : 'pl-negative'
                        }`}>
                          RM {trade.realizedPnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {trade.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {trade.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color
                            }}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
