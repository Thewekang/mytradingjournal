"use client";
import React, { useState, useEffect } from 'react';
import { ExportPerformancePanel } from '@/components/export-performance-panel';

interface Job {
  id: string; type: string; format: string; status: string; createdAt: number; startedAt?: number; completedAt?: number; error?: string; filename?: string; downloadToken?: string; tokenExpiresAt?: number; tokenConsumed?: boolean;
}

export default function ExportJobsClient(){
  const [jobs,setJobs]=useState<Job[]>([]);
  const [loading,setLoading]=useState(false);
  const [type,setType]=useState('trades');
  const [format,setFormat]=useState('csv');
  const [params,setParams]=useState<{dateFrom?:string; dateTo?:string; tagIds?:string}>({});
  const TRADE_COLUMNS = ['id','instrumentId','direction','entryPrice','exitPrice','quantity','status','entryAt','exitAt'];
  const [selectedColumns,setSelectedColumns] = useState<string[]>([...TRADE_COLUMNS]);
  // Determine if PDF export UI should be enabled (server still enforces ENABLE_PDF_EXPORT)
  const pdfUiEnabled = process.env.NEXT_PUBLIC_ENABLE_PDF_EXPORT === '1';

  function buildPdfUrl() {
    const qs = new URLSearchParams();
    if (params.dateFrom) qs.set('from', params.dateFrom);
    if (params.dateTo) qs.set('to', params.dateTo);
    if (params.tagIds) {
      params.tagIds.split(',').map(s=>s.trim()).filter(Boolean).forEach(t => qs.append('tagId', t));
    }
    const q = qs.toString();
    return `/api/dashboard/export/pdf${q ? `?${q}` : ''}`;
  }
  async function refresh(){
    const res = await fetch('/api/exports/jobs');
    if(res.ok){ const json = await res.json(); setJobs(json.data||[]); }
  }
  useEffect(()=>{ refresh(); const t=setInterval(refresh,2000); return ()=>clearInterval(t); },[]);
  async function createJob(){
    setLoading(true);
    try {
      const body: { type: string; format: string; params: Record<string, unknown> } = { type, format, params:{} };
      if(type==='trades'){
        const allSelected = selectedColumns.length === TRADE_COLUMNS.length;
        body.params = {
          dateFrom: params.dateFrom||undefined,
          dateTo: params.dateTo||undefined,
          tagIds: params.tagIds? params.tagIds.split(',').map(s=>s.trim()).filter(Boolean): undefined,
          selectedColumns: allSelected ? undefined : selectedColumns
        } as Record<string, unknown>;
      }
      const res = await fetch('/api/exports/jobs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if(!res.ok){ const j=await res.json().catch(()=>({})); alert('Failed: '+(j.error?.message||res.status)); }
      await refresh();
    } finally { setLoading(false); }
  }
  function downloadUrl(j: Job){
    return `/api/exports/jobs/${j.id}/download?token=${encodeURIComponent(j.downloadToken||'')}`;
  }
  return <div className="p-4 space-y-4">
    <h1 className="text-xl font-semibold">Exports</h1>
    <ExportPerformancePanel />
    <div className="flex gap-2 flex-wrap items-end">
      <label className="flex flex-col text-sm">Type
        <select value={type} onChange={e=>setType(e.target.value)} className="border rounded p-1">
          <option value="trades">Trades</option>
          <option value="goals">Goals</option>
          <option value="dailyPnl">Daily PnL</option>
          <option value="tagPerformance">Tag Performance</option>
          <option value="chartEquity">Equity Chart (PNG)</option>
        </select>
      </label>
      <label className="flex flex-col text-sm">Format
        <select value={format} onChange={e=>setFormat(e.target.value)} className="border rounded p-1">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">XLSX</option>
          <option value="png">PNG</option>
        </select>
      </label>
  {type==='trades' && <>
        <label className="flex flex-col text-sm">From
          <input type="date" value={params.dateFrom||''} onChange={e=>setParams(p=>({...p,dateFrom:e.target.value||undefined}))} className="border rounded p-1" />
        </label>
        <label className="flex flex-col text-sm">To
          <input type="date" value={params.dateTo||''} onChange={e=>setParams(p=>({...p,dateTo:e.target.value||undefined}))} className="border rounded p-1" />
        </label>
        <label className="flex flex-col text-sm">Tag IDs (comma)
          <input type="text" value={params.tagIds||''} onChange={e=>setParams(p=>({...p,tagIds:e.target.value||undefined}))} className="border rounded p-1" placeholder="tag1,tag2" />
        </label>
        <fieldset className="flex flex-col text-sm max-w-xs">
          <legend className="font-medium mb-1">Columns</legend>
          <div className="grid grid-cols-2 gap-1">
            {TRADE_COLUMNS.map(col => {
              const checked = selectedColumns.includes(col);
              return <label key={col} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={checked}
                  onChange={() => setSelectedColumns(cs => checked ? cs.filter(c=>c!==col) : [...cs, col])}
                />
                <span>{col}</span>
              </label>;
            })}
          </div>
          <div className="mt-1 flex gap-2">
            <button type="button" className="text-xs underline" onClick={()=>setSelectedColumns(TRADE_COLUMNS.slice())}>All</button>
            <button type="button" className="text-xs underline" onClick={()=>setSelectedColumns([])}>None</button>
          </div>
        </fieldset>
  </>}
      {type==='chartEquity' && (
        <div className="text-xs text-[var(--color-muted)]">Exports a PNG of cumulative equity over time.</div>
      )}
      <button onClick={createJob} disabled={loading} className="bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-3 py-2 rounded disabled:opacity-50">{loading? 'Creating...' : 'Create Export'}</button>
      <div className="mx-2 h-6 w-px bg-[var(--color-border)]" aria-hidden="true" />
      <a
        href={buildPdfUrl()}
        target="_blank"
        rel="noopener"
        onClick={(e)=>{ if(!pdfUiEnabled){ e.preventDefault(); alert('PDF export is disabled. Set ENABLE_PDF_EXPORT=1 on the server to enable.'); } }}
        className={`px-3 py-2 rounded border ${pdfUiEnabled ? 'text-[var(--color-accent)] border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10' : 'text-[var(--color-muted)] border-[var(--color-border)] cursor-not-allowed'}`}
        aria-disabled={!pdfUiEnabled}
        title={pdfUiEnabled ? 'Open dashboard PDF in a new tab (applies current filters)' : 'Requires ENABLE_PDF_EXPORT=1'}
      >
        Print Dashboard PDF
      </a>
    </div>
    <table className="w-full text-sm border border-[var(--color-border)]">
      <thead><tr className="bg-[var(--color-bg-muted)]"><th className="p-1 border border-[var(--color-border)]">ID</th><th className="p-1 border border-[var(--color-border)]">Type</th><th className="p-1 border border-[var(--color-border)]">Format</th><th className="p-1 border border-[var(--color-border)]">Status</th><th className="p-1 border border-[var(--color-border)]">Created</th><th className="p-1 border border-[var(--color-border)]">Token</th><th className="p-1 border border-[var(--color-border)]">Actions</th></tr></thead>
      <tbody>
        {jobs.map(j=> {
          const expired = j.tokenExpiresAt && j.tokenExpiresAt < Date.now();
          return <tr key={j.id} className="odd:bg-[var(--color-bg-alt)] even:bg-[var(--color-bg-muted)]">
            <td className="p-1 border border-[var(--color-border)] font-mono truncate max-w-[160px]" title={j.id}>{j.id}</td>
            <td className="p-1 border border-[var(--color-border)]">{j.type}</td>
            <td className="p-1 border border-[var(--color-border)]">{j.format}</td>
            <td className="p-1 border border-[var(--color-border)]">{j.status}{j.error && <span className="text-[var(--color-danger)]"> ({j.error})</span>}</td>
            <td className="p-1 border border-[var(--color-border)]">{new Date(j.createdAt).toLocaleString()}</td>
            <td className="p-1 border border-[var(--color-border)] text-xs" title={j.tokenExpiresAt? new Date(j.tokenExpiresAt).toLocaleString():''}>{j.tokenConsumed? 'used' : expired? 'expired' : j.tokenExpiresAt? Math.max(0, Math.floor((j.tokenExpiresAt-Date.now())/1000))+'s' : '—'}</td>
            <td className="p-1 border border-[var(--color-border)]">{j.status==='completed' && j.filename && !j.tokenConsumed && !expired && <a className="text-[var(--color-accent)] underline" href={downloadUrl(j)}>Download</a>}</td>
          </tr>;
        })}
        {!jobs.length && <tr><td colSpan={7} className="text-center p-4 text-[var(--color-muted)]">No jobs</td></tr>}
      </tbody>
    </table>
  </div>;
}
