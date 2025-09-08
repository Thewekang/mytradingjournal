"use client";
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast-provider';
import { Plus, TrendingUp, TrendingDown, Edit3, Eye, Archive } from 'lucide-react';

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  status: 'OPEN' | 'CLOSED';
  tradeCount: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
  createdAt: string;
  updatedAt: string;
  trades: Array<{
    id: string;
    direction: string;
    entryPrice: number;
    exitPrice: number | null;
    quantity: number;
    fees: number;
    entryAt: string;
    exitAt: string | null;
    status: string;
    instrument: {
      symbol: string;
      contractMultiplier: number | null;
    };
    realizedPnl: number | null;
  }>;
}

interface StrategyForm {
  name: string;
  description: string;
}

export default function StrategiesClient({ initialStrategies }: { initialStrategies: Strategy[] }) {
  const [strategies, setStrategies] = useState<Strategy[]>(initialStrategies);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [form, setForm] = useState<StrategyForm>({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Fetch strategies on component mount
  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategies');
      if (response.ok) {
        const json = await response.json();
        setStrategies(json.data || []);
      } else {
        console.error('Failed to fetch strategies');
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Strategy name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined
        })
      });

      if (response.ok) {
        const json = await response.json();
        setStrategies(prev => [json.data, ...prev]);
        setForm({ name: '', description: '' });
        setShowCreateDialog(false);
        toast.push({
          variant: 'success',
          heading: 'Strategy Created',
          description: 'New strategy created successfully.'
        });
      } else {
        const json = await response.json();
        setError(json.error?.message || 'Failed to create strategy');
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
      setError('Failed to create strategy');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setShowDetailDialog(true);
  };

  const closeDetail = () => {
    setSelectedStrategy(null);
    setShowDetailDialog(false);
  };

  const getStrategyStatusColor = (status: string): 'success' | 'neutral' => {
    return status === 'OPEN' ? 'success' : 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Strategies</h1>
          <p className="text-sm text-[var(--color-muted)]">Manage multi-leg trading strategies and analyze grouped performance</p>
        </div>
        
        <Button
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
          New Strategy
        </Button>
      </div>

      {/* Strategy Cards */}
      {loading && strategies.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Loading strategies...</p>
        </div>
      ) : strategies.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <TrendingUp className="h-12 w-12 text-[var(--color-muted)] mx-auto" />
            <div>
              <h3 className="font-semibold">No strategies yet</h3>
              <p className="text-sm text-[var(--color-muted)] mt-1">
                Create your first strategy to group related trades and analyze performance.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Strategy
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map(strategy => (
            <Card key={strategy.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{strategy.name}</h3>
                    {strategy.description && (
                      <p className="text-sm text-[var(--color-muted)] mt-1 line-clamp-2">
                        {strategy.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStrategyStatusColor(strategy.status)}>
                    {strategy.status}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--color-muted)]">Trades</span>
                    <div className="font-semibold">{strategy.tradeCount}</div>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)]">Win Rate</span>
                    <div className="font-semibold">{(strategy.winRate * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)]">Total P/L</span>
                    <div className={`font-semibold font-mono ${strategy.totalPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                      RM {strategy.totalPnl.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)]">Avg P/L</span>
                    <div className={`font-semibold font-mono ${strategy.avgPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                      RM {strategy.avgPnl.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Performance Indicator */}
                <div className="flex items-center gap-2">
                  {strategy.totalPnl > 0 ? (
                    <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-[var(--color-danger)]" />
                  )}
                  <span className="text-sm text-[var(--color-muted)]">
                    {strategy.totalPnl > 0 ? 'Profitable' : 'Loss-making'} strategy
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetail(strategy)}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                  >
                    <Archive className="h-3 w-3" />
                    Archive
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Strategy Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Strategy</DialogTitle>
          </DialogHeader>
          <form onSubmit={createStrategy} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Strategy Name *
            </label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Momentum Breakouts"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-inset)] text-sm focus-ring"
              rows={3}
              placeholder="Describe your strategy approach..."
            />
          </div>

          {error && (
            <div className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              Create Strategy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {/* Strategy Detail Dialog */}
      {selectedStrategy && (
        <Dialog
          open={showDetailDialog}
          onOpenChange={(open) => !open && closeDetail()}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedStrategy.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
            {/* Strategy Info */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-[var(--color-muted)]">Total Trades</div>
                <div className="text-xl font-semibold">{selectedStrategy.tradeCount}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-[var(--color-muted)]">Win Rate</div>
                <div className="text-xl font-semibold">{(selectedStrategy.winRate * 100).toFixed(1)}%</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-[var(--color-muted)]">Total P/L</div>
                <div className={`text-xl font-semibold font-mono ${selectedStrategy.totalPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                  RM {selectedStrategy.totalPnl.toFixed(2)}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-[var(--color-muted)]">Avg P/L</div>
                <div className={`text-xl font-semibold font-mono ${selectedStrategy.avgPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                  RM {selectedStrategy.avgPnl.toFixed(2)}
                </div>
              </Card>
            </div>

            {/* Trades Table */}
            <div>
              <h4 className="font-semibold mb-3">Strategy Trades</h4>
              {selectedStrategy.trades.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-[var(--color-muted)]">No trades assigned to this strategy yet.</p>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-bg-muted)]">
                        <tr>
                          <th className="text-left p-3">Instrument</th>
                          <th className="text-left p-3">Direction</th>
                          <th className="text-right p-3">Entry</th>
                          <th className="text-right p-3">Exit</th>
                          <th className="text-right p-3">Qty</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-right p-3">P/L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStrategy.trades.map(trade => (
                          <tr key={trade.id} className="border-t border-[var(--color-border)]">
                            <td className="p-3 font-mono">{trade.instrument.symbol}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded ${
                                trade.direction === 'LONG' 
                                  ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                                  : 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                              }`}>
                                {trade.direction}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono">{trade.entryPrice}</td>
                            <td className="p-3 text-right font-mono">{trade.exitPrice || '-'}</td>
                            <td className="p-3 text-right font-mono">{trade.quantity}</td>
                            <td className="p-3">
                              <Badge variant={trade.status === 'CLOSED' ? 'success' : 'neutral'}>
                                {trade.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {trade.realizedPnl != null ? (
                                <span className={`font-mono ${trade.realizedPnl >= 0 ? 'pl-positive' : 'pl-negative'}`}>
                                  RM {trade.realizedPnl.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-muted)]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
