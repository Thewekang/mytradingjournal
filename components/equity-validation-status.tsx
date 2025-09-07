"use client";
import React from 'react';
import { useDailyEquityValidation } from '@/lib/hooks/use-daily-equity-validation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function EquityValidationStatus() {
  const { data, loading, error, rebuild, rebuilding, refresh } = useDailyEquityValidation(0);
  const discrepancyCount = data?.discrepancies.length || 0;
  const healthy = !loading && !error && discrepancyCount === 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Daily Equity Integrity</span>
          {loading && <Badge variant="outline">Loading</Badge>}
          {!loading && healthy && <Badge variant="success">OK</Badge>}
          {!loading && !healthy && discrepancyCount > 0 && <Badge variant="danger">{discrepancyCount} Issues</Badge>}
          {error && <Badge variant="danger">Error</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading || rebuilding}>Refresh</Button>
          <Button size="sm" variant="outline" onClick={rebuild} disabled={rebuilding}>{rebuilding ? 'Rebuilding…' : 'Rebuild & Validate'}</Button>
        </div>
      </div>
      {error && <Alert variant="danger" size="sm">Failed to load validation: {error}</Alert>}
      {!error && data && (
  <div className="text-[11px] text-[var(--color-muted)] flex flex-wrap gap-4">
          {data.lastEquityValidationAt && <span>Last Validate: {new Date(data.lastEquityValidationAt).toLocaleString()}</span>}
          {data.lastEquityRebuildAt && <span>Last Rebuild: {new Date(data.lastEquityRebuildAt).toLocaleString()}</span>}
        </div>
      )}
      {!loading && discrepancyCount > 0 && (
        <div className="border border-[var(--color-border)] rounded-md p-3 bg-[var(--color-bg-muted)]/30">
          <div className="text-xs font-medium mb-2">Discrepancies ({discrepancyCount})</div>
          <div className="max-h-40 overflow-auto text-xs space-y-1">
            {data?.discrepancies.slice(0,50).map(d => (
              <div key={d.date} className="grid grid-cols-5 gap-2">
                <span className="col-span-2 font-mono">{d.date.slice(0,10)}</span>
                <span>{d.diff?.realizedPnl ?? ''}</span>
                <span>{d.diff?.cumulativeEquity ?? ''}</span>
                <span>{d.diff?.tradeCount ?? ''}</span>
              </div>
            ))}
            {discrepancyCount > 50 && <div>… and {discrepancyCount - 50} more</div>}
          </div>
        </div>
      )}
    </div>
  );
}
