// Lightweight client hook/util for fetching pre-aggregated DailyEquity snapshots.
import { useEffect, useState } from 'react';

export interface DailyEquitySnapshot {
  id: string;
  userId: string;
  date: string; // ISO
  realizedPnl: number;
  cumulativeEquity: number;
  tradeCount: number;
}

export function useDailyEquity(range?: { from?: string; to?: string }) {
  const [data, setData] = useState<DailyEquitySnapshot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams();
        if (range?.from) params.set('from', range.from);
        if (range?.to) params.set('to', range.to);
        const res = await fetch('/api/equity/range' + (params.toString() ? ('?' + params.toString()) : ''));
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!cancelled) setData(json.data || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'error');
      } finally { if (!cancelled) setLoading(false); }
    }
    run();
    return () => { cancelled = true; };
  }, [range?.from, range?.to]);
  return { data, loading, error };
}