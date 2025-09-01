// In-memory export job queue (experimental / non-persistent)
// Feature flagged via ENABLE_EXPORT_QUEUE=1
// For production use, persist jobs (DB) and move processor to a separate worker.

export type ExportJobType = 'trades' | 'goals' | 'dailyPnl' | 'tagPerformance';
export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportJobParamsMap {
  trades: { limit?: number };
  goals: Record<string, never>;
  dailyPnl: Record<string, never>;
  tagPerformance: Record<string, never>;
}
type ExportJobParams = ExportJobParamsMap[ExportJobType];

export interface ExportJob {
  id: string;
  userId: string;
  type: ExportJobType;
  format: ExportFormat;
  params: ExportJobParams;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  filename?: string;
  contentType?: string;
  payloadBase64?: string; // base64 of content (small/medium datasets)
  attemptCount?: number; // for parity with persistent schema
}

const jobs = new Map<string, ExportJob>();
const queue: string[] = [];
let running = 0;
const MAX_CONCURRENCY = 1;

function genId() { return Math.random().toString(36).slice(2, 10); }

export function createJob<K extends ExportJobType>(userId: string, type: K, format: ExportFormat, params: ExportJobParamsMap[K]): ExportJob {
  const job: ExportJob = { id: genId(), userId, type, format, params, status: 'queued', createdAt: Date.now(), attemptCount: 0 };
  jobs.set(job.id, job);
  queue.push(job.id);
  tick();
  return job;
}

export function getJob(id: string) { return jobs.get(id); }
export function listJobs(userId: string) { return Array.from(jobs.values()).filter(j => j.userId === userId).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100); }

import { buildExport } from '@/lib/export/builders';

// Narrow param type via mapping interface
type BuilderType = ExportJobType;
type BuilderParams = {
  trades: ExportJobParamsMap['trades'];
  goals: ExportJobParamsMap['goals'];
  dailyPnl: ExportJobParamsMap['dailyPnl'];
  tagPerformance: ExportJobParamsMap['tagPerformance'];
};

async function buildAny(job: ExportJob) {
  return buildExport(job.userId, job.type as BuilderType, job.format, job.params as BuilderParams[BuilderType]);
}

async function runJob(job: ExportJob) {
  job.status = 'running';
  job.startedAt = Date.now();
  try {
  const built = await buildAny(job);
  job.contentType = built.contentType;
  job.filename = built.filename;
  const rawData = built.data instanceof Buffer ? built.data : Buffer.from(built.data);
  job.payloadBase64 = rawData.toString('base64');
    job.status = 'completed';
    job.completedAt = Date.now();
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'error';
    job.status = 'failed';
    job.error = msg;
    job.completedAt = Date.now();
  }
}

function tick() {
  if (running >= MAX_CONCURRENCY) return;
  const id = queue.shift();
  if (!id) return;
  const job = jobs.get(id);
  if (!job) return;
  running++;
  runJob(job).finally(() => { running--; setTimeout(() => tick(), 0); });
  if (running < MAX_CONCURRENCY) setTimeout(() => tick(), 0);
}

// Cleanup old jobs periodically (older than 15 min)
setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [id, job] of jobs) { if (job.completedAt && job.completedAt < cutoff) jobs.delete(id); }
}, 60_000).unref?.();

// Basic metrics exposure for health endpoint
export const inMemoryExportMetrics = {
  get queued() { return queue.length; },
  get running() { return running; },
  get total() { return jobs.size; }
};
