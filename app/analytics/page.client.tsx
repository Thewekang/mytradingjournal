"use client";
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EquityCurve } from '@/components/charts/equity-curve';
import { MonthlyBars } from '@/components/charts/monthly-bars';
import { WinLossDonut } from '@/components/charts/win-loss-donut';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, Calendar, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  summary: {
    totalTrades: number;
    winRate: number;
    expectancy: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    maxConsecutiveLosses: number;
    currentConsecutiveLosses: number;
    avgHoldMinutes: number;
    dailyVariance: number;
  } | null;
  equity: Array<{ date: string; equity: number }>;
  daily: Array<{ date: string; pnl: number; tradeCount: number }>;
  monthly: Array<{ month: string; pnl: number; trades: number; winRate: number }>;
  distribution: {
    wins: number;
    losses: number;
    breakeven: number;
    winRate: number;
  } | null;
  drawdown: {
    maxDrawdown: number;
    currentDrawdown: number;
    maxDrawdownStart: string;
    maxDrawdownEnd: string;
  } | null;
  tagPerformance: Array<{
    tagId: string;
    label: string;
    color: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    sumPnl: number;
    avgPnl: number;
  }>;
}

interface Filters {
  from?: string;
  to?: string;
}

export default function AnalyticsClient({ 
  initialData, 
  initialFilters 
}: { 
  initialData: AnalyticsData; 
  initialFilters: Filters; 
}) {
  const [data] = useState(initialData);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const applyFilters = async () => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    if (filters.from) searchParams.set('from', filters.from);
    if (filters.to) searchParams.set('to', filters.to);
    
    router.push(`/analytics?${searchParams}`);
  };

  const exportAnalytics = async (type: string, format: string) => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      
      let endpoint = '';
      switch (type) {
        case 'daily':
          endpoint = `/api/analytics/daily/export?format=${format}&${params}`;
          break;
        case 'tagPerformance':
          endpoint = `/api/analytics/tag-performance/export?format=${format}&${params}`;
          break;
        default:
          return;
      }
      
      window.open(endpoint, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Transform equity data for chart
  const equityPoints = data.equity.map(e => ({
    time: e.date,
    equity: e.equity,
    pnl: 0,
    tradeId: ''
  }));

  const { summary, distribution, drawdown, tagPerformance, monthly, daily } = data;

  // Calculate additional metrics
  const totalPnl = equityPoints.length > 0 ? equityPoints[equityPoints.length - 1].equity : 0;
  const bestDay = daily.length > 0 ? Math.max(...daily.map(d => d.pnl)) : 0;
  const worstDay = daily.length > 0 ? Math.min(...daily.map(d => d.pnl)) : 0;
  const avgDailyPnl = daily.length > 0 ? daily.reduce((sum, d) => sum + d.pnl, 0) / daily.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-[var(--color-muted)]">Comprehensive trading performance analysis</p>
        </div>
        
        {/* Date Filters */}
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={filters.from || ''}
            onChange={(e) => setFilters(f => ({ ...f, from: e.target.value || undefined }))}
            placeholder="From"
            className="h-8"
          />
          <Input
            type="date"
            value={filters.to || ''}
            onChange={(e) => setFilters(f => ({ ...f, to: e.target.value || undefined }))}
            placeholder="To"
            className="h-8"
          />
          <Button size="sm" onClick={applyFilters} disabled={loading}>
            Apply
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
            <span className="text-sm text-[var(--color-muted)]">Total P/L</span>
          </div>
          <div className={`text-lg font-semibold ${totalPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
            RM {totalPnl.toFixed(2)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--color-accent)]" />
            <span className="text-sm text-[var(--color-muted)]">Win Rate</span>
          </div>
          <div className="text-lg font-semibold">
            {summary ? (summary.winRate * 100).toFixed(1) : 0}%
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-info)]" />
            <span className="text-sm text-[var(--color-muted)]">Expectancy</span>
          </div>
          <div className={`text-lg font-semibold ${summary && summary.expectancy >= 0 ? 'pl-positive' : 'pl-negative'}`}>
            {summary ? summary.expectancy.toFixed(2) : '-'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
            <span className="text-sm text-[var(--color-muted)]">Max DD</span>
          </div>
          <div className="text-lg font-semibold pl-negative">
            RM {drawdown ? drawdown.maxDrawdown.toFixed(2) : '0.00'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--color-muted)]" />
            <span className="text-sm text-[var(--color-muted)]">Best Day</span>
          </div>
          <div className="text-lg font-semibold pl-positive">
            RM {bestDay.toFixed(2)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[var(--color-danger)]" />
            <span className="text-sm text-[var(--color-muted)]">Worst Day</span>
          </div>
          <div className="text-lg font-semibold pl-negative">
            RM {worstDay.toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="tags">Tag Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Equity Curve */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Equity Curve</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportAnalytics('equity', 'png')}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="h-80">
              <EquityCurve points={equityPoints} />
            </div>
          </Card>

          {/* Monthly Performance & Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
              <div className="h-64">
                <MonthlyBars data={monthly} />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Win/Loss Distribution</h3>
              <div className="h-64">
                <WinLossDonut 
                  wins={distribution?.wins || 0} 
                  losses={distribution?.losses || 0} 
                  breakeven={distribution?.breakeven || 0} 
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {/* Trading Patterns */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Daily P/L Pattern</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Average Daily P/L:</span>
                  <span className={`font-mono ${avgDailyPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                    RM {avgDailyPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Daily Variance:</span>
                  <span className="font-mono">
                    {summary ? summary.dailyVariance.toFixed(2) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Consistency Score:</span>
                  <span className="font-mono">
                    {summary && summary.dailyVariance > 0 
                      ? ((avgDailyPnl / Math.sqrt(summary.dailyVariance)) * 100).toFixed(1) + '%'
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Trading Habits</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Avg Hold Time:</span>
                  <span className="font-mono">
                    {summary ? (summary.avgHoldMinutes / 60).toFixed(1) : '-'} hours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Avg Win Size:</span>
                  <span className="font-mono pl-positive">
                    RM {summary ? summary.avgWin.toFixed(2) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Avg Loss Size:</span>
                  <span className="font-mono pl-negative">
                    RM {summary ? summary.avgLoss.toFixed(2) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Win/Loss Ratio:</span>
                  <span className="font-mono">
                    {summary && summary.avgLoss > 0 
                      ? (summary.avgWin / summary.avgLoss).toFixed(2)
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {/* Risk Metrics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Drawdown Analysis</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Max Drawdown:</span>
                  <span className="font-mono pl-negative">
                    RM {drawdown ? drawdown.maxDrawdown.toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Current Drawdown:</span>
                  <span className="font-mono pl-negative">
                    RM {drawdown ? drawdown.currentDrawdown.toFixed(2) : '0.00'}
                  </span>
                </div>
                {drawdown && drawdown.maxDrawdownStart && (
                  <div className="text-xs text-[var(--color-muted)] mt-2">
                    Period: {new Date(drawdown.maxDrawdownStart).toLocaleDateString()} - {new Date(drawdown.maxDrawdownEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Loss Streaks</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Current Streak:</span>
                  <span className="font-mono">
                    {summary ? summary.currentConsecutiveLosses : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Max Streak:</span>
                  <span className="font-mono">
                    {summary ? summary.maxConsecutiveLosses : 0}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Risk Ratios</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Profit Factor:</span>
                  <span className="font-mono">
                    {summary && summary.profitFactor != null ? summary.profitFactor.toFixed(2) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Sharpe Ratio:</span>
                  <span className="font-mono">
                    {summary && summary.dailyVariance > 0 
                      ? (avgDailyPnl / Math.sqrt(summary.dailyVariance)).toFixed(2)
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          {/* Tag Performance */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tag Performance Analysis</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportAnalytics('tagPerformance', 'csv')}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
            
            {tagPerformance.length === 0 ? (
              <p className="text-[var(--color-muted)] text-center py-8">No tagged trades found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2">Tag</th>
                      <th className="text-right py-2">Trades</th>
                      <th className="text-right py-2">Win Rate</th>
                      <th className="text-right py-2">Total P/L</th>
                      <th className="text-right py-2">Avg P/L</th>
                      <th className="text-right py-2">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagPerformance
                      .sort((a, b) => b.sumPnl - a.sumPnl)
                      .map(tag => (
                        <tr key={tag.tagId} className="border-b border-[var(--color-border)]">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span>{tag.label}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 font-mono">{tag.trades}</td>
                          <td className="text-right py-3 font-mono">
                            {(tag.winRate * 100).toFixed(1)}%
                          </td>
                          <td className={`text-right py-3 font-mono ${tag.sumPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                            RM {tag.sumPnl.toFixed(2)}
                          </td>
                          <td className={`text-right py-3 font-mono ${tag.avgPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                            RM {tag.avgPnl.toFixed(2)}
                          </td>
                          <td className="text-right py-3">
                            <div className="flex items-center justify-end gap-1">
                              {tag.sumPnl > 0 ? (
                                <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-[var(--color-danger)]" />
                              )}
                              <span className="text-xs">
                                {tag.sumPnl > 0 ? 'Profitable' : 'Loss-making'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
