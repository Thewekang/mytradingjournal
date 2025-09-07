"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ExportPerfRow {
  jobId: string;
  waitMs: number;
  durMs: number;
  sizeBytes: number;
  streamed: boolean;
  streamedChunks: number;
  streamedBytes: number;
  avgChunkMs: number;
  avgChunkBytes: number;
  attempt: number;
  createdAt: number;
}

interface State { rows: ExportPerfRow[]; loading: boolean; error?: string }

export function useExportPerformance(pollMs = 0, limit = 50){
  const [state,setState] = useState<State>({ rows: [], loading: true });
  const timer = useRef<number|undefined>(undefined);

  const load = useCallback(async ()=>{
    try {
      setState(s=>({...s, loading:true, error: undefined}));
      const res = await fetch(`/api/exports/jobs/perf?limit=${limit}`);
      if(!res.ok) throw new Error('bad_status');
      const json = await res.json();
      setState({ rows: json.data||[], loading:false });
    } catch(e){
      setState(s=>({...s, loading:false, error:(e as Error).message || 'error'}));
    }
  },[limit]);

  useEffect(()=>{ load(); if(pollMs>0){ timer.current = window.setInterval(load,pollMs); return ()=>{ if(timer.current) window.clearInterval(timer.current); }; } },[load,pollMs]);

  return { ...state, refresh: load };
}

export interface PerfSummary { count: number; streamedCount: number; p50Dur: number; p95Dur: number; p50Wait: number; p95Wait: number; avgSizeKB: number; avgThroughputKBs: number }

export function summarize(rows: ExportPerfRow[]): PerfSummary {
  if(!rows.length) return { count:0, streamedCount:0, p50Dur:0, p95Dur:0, p50Wait:0, p95Wait:0, avgSizeKB:0, avgThroughputKBs:0 };
  const sortedDur = [...rows].sort((a,b)=>a.durMs-b.durMs);
  const sortedWait = [...rows].sort((a,b)=>a.waitMs-b.waitMs);
  function pct(arr: ExportPerfRow[], p: number){ if(!arr.length) return 0; const i = Math.min(arr.length-1, Math.floor(p/100*arr.length)); return arr[i].durMs; }
  function pctWait(arr: ExportPerfRow[], p: number){ if(!arr.length) return 0; const i = Math.min(arr.length-1, Math.floor(p/100*arr.length)); return arr[i].waitMs; }
  const totalSize = rows.reduce((a,r)=>a+r.sizeBytes,0);
  const avgSizeKB = totalSize/rows.length/1024;
  const avgThroughputKBs = rows.reduce((a,r)=> a + (r.durMs>0 ? (r.sizeBytes/1024)/(r.durMs/1000) : 0),0)/rows.length;
  const streamedCount = rows.filter(r=>r.streamed).length;
  return { count: rows.length, streamedCount, p50Dur: pct(sortedDur,50), p95Dur: pct(sortedDur,95), p50Wait: pctWait(sortedWait,50), p95Wait: pctWait(sortedWait,95), avgSizeKB, avgThroughputKBs };
}
