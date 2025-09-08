"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePropEvalProgress } from '@/lib/hooks/use-prop-eval-progress';

export function PropEvaluationCard() {
  const { progress, loading, error, refresh } = usePropEvalProgress(60_000);

  if (error) {
    return (
      <Card className="p-4 opacity-75">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Prop Evaluation</h3>
          <button className="text-[10px] text-[var(--color-accent)] underline" onClick={()=>refresh()}>Retry</button>
        </div>
        <p className="text-xs text-[var(--color-danger)]">Failed to load evaluation. Please try again.</p>
      </Card>
    );
  }

  if (loading && !progress) {
    return (
      <Card className="p-4 opacity-75">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Prop Evaluation</h3>
        </div>
        <Progress indeterminate aria-label="Loading evaluation" />
      </Card>
    );
  }

  if (!progress || !progress.active) {
    return (
      <Card className="p-4 opacity-75">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Prop Evaluation</h3>
          <button className="text-[10px] text-[var(--color-accent)] underline" onClick={()=>refresh()}>Refresh</button>
        </div>
        <p className="text-xs text-[var(--color-muted)]">No active evaluation configured. Create one via API to track target, losses, and alerts.</p>
      </Card>
    );
  }

  const pct = typeof progress.progressPct === 'number' ? Math.max(0, Math.min(100, progress.progressPct)) : 0;
  const remainingDaily = progress.remainingDailyLoss ?? undefined;
  const remainingOverall = progress.remainingOverallLoss ?? undefined;
  const alerts = progress.alerts || [];

  function levelToVariant(level: 'INFO'|'WARN'|'BLOCK'){
    return level === 'BLOCK' ? 'danger' : level === 'WARN' ? 'warning' : 'info' as const;
  }

  return (
    <Card className="p-4 opacity-75">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Prop Evaluation</h3>
        <button className="text-[10px] text-[var(--color-accent)] underline" onClick={()=>refresh()}>Refresh</button>
      </div>
      <div className="text-xs text-[var(--color-muted)] mb-1">Progress to Target</div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={pct} aria-label="Evaluation progress" />
        </div>
        <div className="text-xs w-16 text-right font-medium">{pct.toFixed(1)}%</div>
      </div>
    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
        <div>
          <div className="text-[var(--color-muted)]">Cumulative P/L</div>
      <div className={`font-semibold ${progress.cumulativeProfit != null && progress.cumulativeProfit < 0 ? 'pl-negative' : ''}`}>RM {(progress.cumulativeProfit ?? 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[var(--color-muted)]">Target</div>
          <div className="font-semibold">RM {(progress.profitTarget ?? 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[var(--color-muted)]">Remaining Daily Loss</div>
          <div className="font-medium">{remainingDaily != null ? `RM ${remainingDaily.toFixed(2)}` : '-'}</div>
        </div>
        <div>
          <div className="text-[var(--color-muted)]">Remaining Overall Loss</div>
          <div className="font-medium">{remainingOverall != null ? `RM ${remainingOverall.toFixed(2)}` : '-'}</div>
        </div>
      </div>
      {alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {alerts.map(a => (
            <Badge key={a.code} variant={levelToVariant(a.level)}>{a.code.replace('PF_','').replaceAll('_',' ')}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
