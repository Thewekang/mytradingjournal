"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DailyEquityValidationResult {
  discrepancies: Array<{
    date: string;
    stored?: { realizedPnl: number; cumulativeEquity: number; tradeCount: number };
    expected?: { realizedPnl: number; cumulativeEquity: number; tradeCount: number };
    diff?: { realizedPnl?: number; cumulativeEquity?: number; tradeCount?: number };
  }>;
  expectedCount: number;
  storedCount: number;
  lastEquityValidationAt?: string;
  lastEquityRebuildAt?: string;
}

interface State {
  data?: DailyEquityValidationResult;
  loading: boolean;
  error?: string;
  rebuilding: boolean;
}

export function useDailyEquityValidation(pollMs = 0) {
  const [state, setState] = useState<State>({ loading: true, rebuilding: false });
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true, error: undefined }));
      const res = await fetch('/api/equity/validate');
      if (!res.ok) throw new Error('bad_status');
      const json = await res.json();
      setState(s => ({ ...s, data: json.data, loading: false }));
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message || 'error', loading: false }));
    }
  }, []);

  const rebuild = useCallback(async () => {
    try {
      setState(s => ({ ...s, rebuilding: true, error: undefined }));
      const res = await fetch('/api/equity/validate', { method: 'POST' });
      if (!res.ok) throw new Error('bad_status');
      const json = await res.json();
      setState(s => ({ ...s, data: json.data, rebuilding: false }));
    } catch (e) {
      setState(s => ({ ...s, rebuilding: false, error: (e as Error).message || 'error' }));
    }
  }, []);

  useEffect(() => {
    load();
    if (pollMs > 0) {
      timer.current = window.setInterval(load, pollMs);
      return () => { if (timer.current) window.clearInterval(timer.current); };
    }
  }, [load, pollMs]);

  return { ...state, refresh: load, rebuild };
}
