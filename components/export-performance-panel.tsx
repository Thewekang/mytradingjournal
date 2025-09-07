"use client";
import React from 'react';
import { useExportPerformance, summarize } from '@/lib/hooks/use-export-performance';

export function ExportPerformancePanel(){
  const { rows, loading, error, refresh } = useExportPerformance(5000, 60);
  const summary = summarize(rows);
  const lastDurations = rows.slice(0,20).map(r=>r.durMs).reverse();
  const maxDur = Math.max(1,...lastDurations);
  const spark = lastDurations.map(d=> Math.round((d/maxDur)*20));
  return (
    <div className="space-y-2 border rounded-md p-3 bg-[var(--color-bg-muted)]/30">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-medium">Recent Export Performance</div>
        <div className="flex gap-2 text-xs items-center">
          {loading && <span className="opacity-70">Loading…</span>}
          {error && <span className="text-[var(--color-danger)]">Err</span>}
          <button onClick={refresh} className="underline disabled:opacity-50" disabled={loading}>Refresh</button>
        </div>
      </div>
      <div className="text-xs flex flex-wrap gap-4 items-end">
        <Metric label="Count" value={summary.count} />
        <Metric label="Streamed" value={summary.streamedCount} />
        <Metric label="p50 Dur (ms)" value={summary.p50Dur} />
        <Metric label="p95 Dur (ms)" value={summary.p95Dur} />
        <Metric label="p50 Wait (ms)" value={summary.p50Wait} />
        <Metric label="p95 Wait (ms)" value={summary.p95Wait} />
        <Metric label="Avg Size (KB)" value={summary.avgSizeKB.toFixed(1)} />
        <Metric label="Avg Thruput (KB/s)" value={summary.avgThroughputKBs.toFixed(1)} />
        <div className="flex flex-col">
          <span className="uppercase opacity-60">Dur Trend</span>
          <span className="font-mono tracking-tight" title={lastDurations.join(',')}>
            {spark.map((v,i)=><span key={i} style={{display:'inline-block',width:2,height:Math.max(2,v),background:'var(--color-accent)',marginRight:1,opacity:0.7}} />)}
          </span>
        </div>
      </div>
      <div className="max-h-48 overflow-auto border-t pt-2">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left bg-[var(--color-bg-muted)]">
              <Th>ID</Th><Th>Dur</Th><Th>Wait</Th><Th>SizeKB</Th><Th>Stream</Th><Th>Chunks</Th><Th>Throughput</Th><Th>At</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const kb = (r.sizeBytes/1024).toFixed(1);
              const thr = r.durMs>0 ? ((r.sizeBytes/1024)/(r.durMs/1000)).toFixed(1) : '0';
              return <tr key={r.jobId} className="odd:bg-[var(--color-bg-alt)] even:bg-[var(--color-bg-muted)]/20">
                <td className="pr-2 py-1 font-mono truncate max-w-[90px]" title={r.jobId}>{r.jobId}</td>
                <td className="pr-2 py-1">{r.durMs}</td>
                <td className="pr-2 py-1">{r.waitMs}</td>
                <td className="pr-2 py-1">{kb}</td>
                <td className="pr-2 py-1">{r.streamed? 'Y':'N'}</td>
                <td className="pr-2 py-1">{r.streamedChunks}</td>
                <td className="pr-2 py-1">{thr}</td>
                <td className="pr-2 py-1" title={new Date(r.createdAt).toLocaleString()}>{timeAgo(r.createdAt)}</td>
              </tr>;
            })}
            {!rows.length && !loading && <tr><td colSpan={8} className="text-center py-2 text-[var(--color-muted)]">No data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }){ // eslint-disable-line @typescript-eslint/no-explicit-any
  return <div className="flex flex-col"><span className="uppercase opacity-60">{label}</span><span className="font-mono">{value}</span></div>;
}
function Th({ children }: { children: React.ReactNode }){ return <th className="px-2 py-1 font-medium">{children}</th>; }
function timeAgo(ts: number){ const d = Date.now()-ts; const s = Math.floor(d/1000); if(s<60) return s+'s'; const m=Math.floor(s/60); if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const days=Math.floor(h/24); return days+'d'; }
