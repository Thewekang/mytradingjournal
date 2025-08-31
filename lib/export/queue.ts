// In-memory export job queue (experimental / non-persistent)
// Feature flagged via ENABLE_EXPORT_QUEUE=1
// For production use, persist jobs (DB) and move processor to a separate worker.

export type ExportJobType = 'trades' | 'goals' | 'dailyPnl' | 'tagPerformance';
export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportJob {
  id: string;
  userId: string;
  type: ExportJobType;
  format: ExportFormat;
  params: Record<string, any>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  filename?: string;
  contentType?: string;
  // Small/medium payload kept in memory (base64 for binary)
  payloadBase64?: string;
}

const jobs = new Map<string, ExportJob>();
const queue: string[] = [];
let running = 0;
const MAX_CONCURRENCY = 1;

function genId(){ return Math.random().toString(36).slice(2,10); }

export function createJob(userId: string, type: ExportJobType, format: ExportFormat, params: Record<string, any>): ExportJob {
  const job: ExportJob = { id: genId(), userId, type, format, params, status: 'queued', createdAt: Date.now() };
  jobs.set(job.id, job); queue.push(job.id); tick(); return job;
}

export function getJob(id: string){ return jobs.get(id); }
export function listJobs(userId: string){ return Array.from(jobs.values()).filter(j=>j.userId===userId).sort((a,b)=>b.createdAt-a.createdAt).slice(0,100); }

import { prisma } from '@/lib/prisma';
import { listTrades } from '@/lib/services/trade-service';
import { csvEscape } from '@/lib/export/csv';
import { computeRealizedPnl } from '@/lib/services/trade-service';

async function buildCsv(job: ExportJob): Promise<{ contentType: string; filename: string; data: string }>{
  const userId = job.userId;
  if(job.type==='trades'){
    const { items } = await listTrades(userId, { limit: 5000 });
    const headers = ['id','instrumentId','direction','entryPrice','exitPrice','quantity','status','entryAt','exitAt'];
    const lines = [headers.join(',')];
    for(const t of items){
      lines.push(headers.map(h=>csvEscape((t as any)[h] instanceof Date? (t as any)[h].toISOString(): (t as any)[h]??'')).join(','));
    }
    return { contentType:'text/csv', filename:'trades-export.csv', data: lines.join('\n') };
  }
  if(job.type==='goals'){
    const goals = await prisma.goal.findMany({ where:{ userId } });
    const headers=['id','type','period','targetValue','currentValue','startDate','endDate','achievedAt','windowDays'];
    const lines=[headers.join(',')];
    for(const g of goals){
      const base:any = { ...g, startDate:g.startDate.toISOString(), endDate:g.endDate.toISOString(), achievedAt: g.achievedAt? g.achievedAt.toISOString():'' };
      lines.push(headers.map(h=>csvEscape(base[h]??'')).join(','));
    }
    return { contentType:'text/csv', filename:'goals-export.csv', data: lines.join('\n') };
  }
  if(job.type==='dailyPnl'){
    const trades = await prisma.trade.findMany({ where:{ userId, status:'CLOSED', deletedAt:null, exitAt:{ not:null } }, include:{ instrument:{ select:{ contractMultiplier:true } } } });
    const daily: Record<string, number> = {};
    for(const t of trades){ if(!t.exitAt) continue; const pnl = computeRealizedPnl({ entryPrice:t.entryPrice, exitPrice:t.exitPrice??undefined, quantity:t.quantity, direction:t.direction, fees:t.fees, contractMultiplier:(t as any).instrument?.contractMultiplier }); if(pnl==null) continue; const key=t.exitAt.toISOString().slice(0,10); daily[key]=(daily[key]||0)+pnl; }
    const rows = Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0]));
    const lines=['date,pnl'];
    for(const [d,p] of rows) lines.push(`${csvEscape(d)},${csvEscape(p.toFixed(2))}`);
    return { contentType:'text/csv', filename:'daily-pnl.csv', data: lines.join('\n') };
  }
  if(job.type==='tagPerformance'){
    const links = await prisma.tradeTagOnTrade.findMany({ where:{ trade:{ userId, status:'CLOSED', deletedAt:null, exitAt:{ not:null } } }, include:{ tag:true, trade:{ include:{ instrument:{ select:{ contractMultiplier:true } } } } } });
    const map: Record<string,{ label:string; trades:number; wins:number; losses:number; sum:number; }>={};
    for(const l of links){
      const t = l.trade; const pnl = computeRealizedPnl({ entryPrice:t.entryPrice, exitPrice:t.exitPrice??undefined, quantity:t.quantity, direction:t.direction, fees:t.fees, contractMultiplier:(t as any).instrument?.contractMultiplier }); if(pnl==null) continue;
      const bucket = map[l.tagId] || (map[l.tagId]={ label:l.tag.label, trades:0, wins:0, losses:0, sum:0 });
      bucket.trades++; if(pnl>=0) bucket.wins++; else bucket.losses++; bucket.sum+=pnl;
    }
    const headers=['tagId','label','trades','wins','losses','winRate','sumPnl','avgPnl'];
    const lines=[headers.join(',')];
    for(const [tagId,b] of Object.entries(map)){
      const winRate = b.trades? (b.wins/b.trades).toFixed(4):'0';
      const sumPnl = b.sum.toFixed(2); const avgPnl = b.trades? (b.sum/b.trades).toFixed(2):'0';
      const row = [tagId, b.label, b.trades, b.wins, b.losses, winRate, sumPnl, avgPnl];
      lines.push(row.map(v=>csvEscape(v)).join(','));
    }
    return { contentType:'text/csv', filename:'tag-performance.csv', data: lines.join('\n') };
  }
  throw new Error('Unsupported job type');
}

async function runJob(job: ExportJob){
  job.status='running'; job.startedAt=Date.now();
  try {
    if(job.format!=='csv') throw new Error('Only csv supported in queue currently');
    const built = await buildCsv(job);
    job.contentType = built.contentType; job.filename = built.filename; job.payloadBase64 = Buffer.from(built.data).toString('base64');
    job.status='completed'; job.completedAt=Date.now();
  } catch(e:any){ job.status='failed'; job.error=e?.message||'error'; job.completedAt=Date.now(); }
}

function tick(){
  if(running>=MAX_CONCURRENCY) return;
  const id = queue.shift(); if(!id) return;
  const job = jobs.get(id); if(!job) return;
  running++;
  runJob(job).finally(()=>{ running--; setTimeout(()=>tick(),0); });
  // schedule next if capacity remains
  if(running<MAX_CONCURRENCY) setTimeout(()=>tick(),0);
}

// Cleanup old jobs periodically (older than 15 min)
setInterval(()=>{
  const cutoff = Date.now()-15*60_000;
  for(const [id,job] of jobs){ if(job.completedAt && job.completedAt < cutoff) jobs.delete(id); }
}, 60_000).unref?.();
