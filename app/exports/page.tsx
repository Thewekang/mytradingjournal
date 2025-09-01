"use client";
import React, { useState, useEffect } from 'react';

interface Job {
  id: string; type: string; format: string; status: string; createdAt: number; startedAt?: number; completedAt?: number; error?: string; filename?: string; downloadToken?: string; tokenExpiresAt?: number; tokenConsumed?: boolean;
}

export default function ExportJobsPage(){
  const [jobs,setJobs]=useState<Job[]>([]);
  const [loading,setLoading]=useState(false);
  const [type,setType]=useState('trades');
  const [format,setFormat]=useState('csv');
  const [params,setParams]=useState<{dateFrom?:string; dateTo?:string; tagIds?:string}>({});
  // Available trade columns (keep in sync with defaultHeaders in builders.ts)
  const TRADE_COLUMNS = ['id','instrumentId','direction','entryPrice','exitPrice','quantity','status','entryAt','exitAt'];
  const [selectedColumns,setSelectedColumns] = useState<string[]>([...TRADE_COLUMNS]);
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
    <div className="flex gap-2 flex-wrap items-end">
      <label className="flex flex-col text-sm">Type
        <select value={type} onChange={e=>setType(e.target.value)} className="border rounded p-1">
          <option value="trades">Trades</option>
          <option value="goals">Goals</option>
          <option value="dailyPnl">Daily PnL</option>
          <option value="tagPerformance">Tag Performance</option>
        </select>
      </label>
      <label className="flex flex-col text-sm">Format
        <select value={format} onChange={e=>setFormat(e.target.value)} className="border rounded p-1">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">XLSX</option>
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
      <button onClick={createJob} disabled={loading} className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50">{loading? 'Creating...' : 'Create Export'}</button>
    </div>
    <table className="w-full text-sm border">
      <thead><tr className="bg-gray-100"><th className="p-1 border">ID</th><th className="p-1 border">Type</th><th className="p-1 border">Format</th><th className="p-1 border">Status</th><th className="p-1 border">Created</th><th className="p-1 border">Token</th><th className="p-1 border">Actions</th></tr></thead>
      <tbody>
        {jobs.map(j=> {
          const expired = j.tokenExpiresAt && j.tokenExpiresAt < Date.now();
          return <tr key={j.id} className="odd:bg-white even:bg-gray-50">
            <td className="p-1 border font-mono truncate max-w-[160px]" title={j.id}>{j.id}</td>
            <td className="p-1 border">{j.type}</td>
            <td className="p-1 border">{j.format}</td>
            <td className="p-1 border">{j.status}{j.error && <span className="text-red-600"> ({j.error})</span>}</td>
            <td className="p-1 border">{new Date(j.createdAt).toLocaleString()}</td>
            <td className="p-1 border text-xs" title={j.tokenExpiresAt? new Date(j.tokenExpiresAt).toLocaleString():''}>{j.tokenConsumed? 'used' : expired? 'expired' : j.tokenExpiresAt? Math.max(0, Math.floor((j.tokenExpiresAt-Date.now())/1000))+'s' : '—'}</td>
            <td className="p-1 border">{j.status==='completed' && j.filename && !j.tokenConsumed && !expired && <a className="text-blue-600 underline" href={downloadUrl(j)}>Download</a>}</td>
          </tr>;
        })}
        {!jobs.length && <tr><td colSpan={7} className="text-center p-4 text-gray-500">No jobs</td></tr>}
      </tbody>
    </table>
  </div>;
}
