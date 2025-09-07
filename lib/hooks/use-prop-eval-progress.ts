"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

interface Alert { code: string; level: 'INFO'|'WARN'|'BLOCK'; message: string }
export interface PropEvalProgress {
  active: boolean;
  profitTarget?: number;
  cumulativeProfit?: number;
  progressPct?: number;
  remainingDailyLoss?: number;
  remainingOverallLoss?: number;
  alerts: Alert[];
}

export function usePropEvalProgress(intervalMs = 60000) {
  const [progress, setProgress] = useState<PropEvalProgress | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setError(undefined);
      const res = await fetch('/api/prop/evaluation/progress');
      if (!res.ok) throw new Error('bad_status');
      const json = await res.json();
      setProgress(json.data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (intervalMs > 0) {
      timer.current = window.setInterval(load, intervalMs);
      return () => { if (timer.current) window.clearInterval(timer.current); };
    }
  }, [load, intervalMs]);

  return { progress, loading, error, refresh: load };
}
