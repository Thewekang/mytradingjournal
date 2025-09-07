import { prisma } from '@/lib/prisma';
import type { ExportJob, Prisma } from '@prisma/client';
import { buildExport } from '@/lib/export/builders';
import { runInSpan, captureException } from '@/lib/observability';
import { getExportMemorySoftLimitMB } from '@/lib/constants';
import { logger } from '@/lib/logger';
// Service helpers for persistent export job queue.
export interface CreateExportJobInput {
  userId: string;
  type: string;
  format: string;
  params: Record<string, unknown>;
  requestId?: string;
}

export async function createExportJob(input: CreateExportJobInput): Promise<ExportJob> {
  const job = await prisma.exportJob.create({ data: { userId: input.userId, type: input.type, format: input.format, paramsJson: input.params as Prisma.InputJsonValue, status: 'queued', requestId: input.requestId } });
  logger.info({ jobId: job.id, requestId: job.requestId, type: job.type, format: job.format, userId: input.userId }, 'export.job.enqueued');
  return job;
}

export async function getExportJob(id: string, userId: string): Promise<ExportJob | null> {
  return prisma.exportJob.findFirst({ where: { id, userId } });
}

export async function listExportJobs(userId: string, limit = 50): Promise<ExportJob[]> {
  return prisma.exportJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
}

export async function listExportJobsByRequest(userId: string, requestId: string, limit = 50): Promise<ExportJob[]> {
  return prisma.exportJob.findMany({ where: { userId, requestId }, orderBy: { createdAt: 'desc' }, take: limit });
}

export async function markJobRunning(id: string): Promise<ExportJob> {
  return prisma.exportJob.update({ where: { id }, data: { status: 'running', startedAt: new Date() } });
}

export async function markJobCompleted(id: string, data: { filename: string; contentType: string; payloadBase64: string }): Promise<ExportJob> {
  return prisma.exportJob.update({ where: { id }, data: { status: 'completed', filename: data.filename, contentType: data.contentType, payloadBase64: data.payloadBase64, completedAt: new Date() } });
}

export async function markJobFailed(id: string, error: string): Promise<ExportJob> {
  return prisma.exportJob.update({ where: { id }, data: { status: 'failed', error, completedAt: new Date() } });
}

// Deterministic single-job processor (bypasses queue scan) for tests that need immediate execution
// Does not perform retry/backoff logic or performance instrumentation; focuses on correctness of status transitions.
export async function processExportJobImmediate(id: string) {
  const job = await prisma.exportJob.findUnique({ where: { id } });
  if (!job) throw new Error('Job not found');
  if (job.status !== 'queued') return job; // Only process queued jobs deterministically
  await markJobRunning(job.id);
  const correlationId = job.id;
  const requestId = (job as any).requestId; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const start = Date.now();
    const memBefore = process.memoryUsage();
    logger.info({ jobId: job.id, correlationId, requestId, type: job.type, format: job.format, attempt: (job as any).attemptCount, workerPid: process.pid }, 'export.job.started.immediate'); // eslint-disable-line @typescript-eslint/no-explicit-any
    const built = await runInSpan(
      'export.build',
      { jobId: job.id, userId: job.userId, type: job.type, format: job.format, immediate: true },
      async () => await buildExport(job.userId, job.type as any, job.format as any, job.paramsJson as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    let raw: Buffer;
    if (built.data instanceof Buffer) {
      raw = built.data;
    } else if (typeof built.data === 'string') {
      raw = Buffer.from(built.data);
    } else if (built.data && Symbol.asyncIterator in (built.data as any)) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const limitBytes = getExportMemorySoftLimitMB() * 1024 * 1024;
      const chunks: Buffer[] = [];
      let streamedBytes = 0;
      for await (const chunk of built.data as AsyncGenerator<string>) {
        const buf = Buffer.from(chunk);
        streamedBytes += buf.length;
        if (streamedBytes > limitBytes) {
          throw new Error(`Export memory soft limit exceeded (${streamedBytes} > ${limitBytes} bytes)`);
        }
        chunks.push(buf);
      }
      raw = Buffer.concat(chunks);
    } else {
      raw = Buffer.from('');
    }
    await markJobCompleted(job.id, { filename: built.filename, contentType: built.contentType, payloadBase64: raw.toString('base64') });
    const dur = Date.now() - start;
    const memAfter = process.memoryUsage();
    logger.info({ jobId: job.id, correlationId, requestId, type: job.type, format: job.format, workerPid: process.pid, dur, rssDelta: memAfter.rss - memBefore.rss }, 'export.job.completed.immediate');
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'error';
  captureException(e, { jobId: job.id, userId: job.userId, type: job.type, format: job.format, immediate: true, requestId });
    logger.error({ jobId: job.id, correlationId, requestId, type: job.type, format: job.format, workerPid: process.pid, err: msg }, 'export.job.failed.immediate');
    await markJobFailed(job.id, msg);
  }
  return prisma.exportJob.findUnique({ where: { id } });
}

// Update token metadata (expiry / consumption)
export async function updateExportJobTokenMeta(id: string, data: { downloadTokenExpiresAt?: Date | null; downloadTokenConsumedAt?: Date | null }) {
  try {
    return await prisma.exportJob.update({ where: { id }, data: data as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
  } catch {
    // If columns don't exist (migration not run), swallow gracefully.
    return prisma.exportJob.findUnique({ where: { id } }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

// Simple poll worker (in-process). In production use a separate worker process.
// Exposed via ensureExportWorker() for tests to deterministically start it.
let workerStarted = false;
const persistMetrics = { processed: 0, failed: 0, running: 0, retried: 0, lastDurationsMs: [] as number[] };
let perfTableInitPromise: Promise<void> | null = null;
let lastPerfPrune = 0;

async function ensurePerfTable() {
  if (!perfTableInitPromise) {
    perfTableInitPromise = (async () => {
      try {
        // Raw table so we avoid mandatory schema migration for this instrumentation.
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ExportJobPerformance" (
          job_id text PRIMARY KEY,
          wait_ms integer,
            dur_ms integer,
            size_bytes integer,
            streamed boolean,
            streamed_chunks integer,
            streamed_bytes integer,
            avg_chunk_ms double precision,
            avg_chunk_bytes integer,
            chunk_ms_p50 double precision,
            chunk_ms_p95 double precision,
            chunk_ms_max double precision,
            chunk_bytes_p50 double precision,
            chunk_bytes_p95 double precision,
            chunk_bytes_max double precision,
            rss_delta bigint,
            heap_used_delta bigint,
            attempt integer,
            created_at timestamptz DEFAULT now()
        );`);
      } catch (e) {
        // swallow - instrumentation only
        logger.warn({ err: (e as any)?.message }, 'export.perf.table.init.failed'); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    })();
  }
  return perfTableInitPromise;
}

export async function pruneOldPerformanceRows(maxAgeDays = 30) {
  const now = Date.now();
  if (now - lastPerfPrune < 60 * 60 * 1000) return; // prune at most hourly
  lastPerfPrune = now;
  try {
  await prisma.$executeRawUnsafe(`DELETE FROM "ExportJobPerformance" WHERE created_at < now() - interval '${maxAgeDays} days'`);
  } catch { /* ignore prune failures */ }
}

async function persistJobPerformance(row: {
  jobId: string; waitMs: number; dur: number; size: number; streamed: boolean; streamedChunks: number; streamedBytes: number;
  avgChunkMs: number; avgChunkBytes: number; chunkMsP50: number; chunkMsP95: number; chunkMsMax: number;
  chunkBytesP50: number; chunkBytesP95: number; chunkBytesMax: number; rssDelta: number; heapUsedDelta: number; attempt: number;
}) {
  try {
    await ensurePerfTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ExportJobPerformance" (job_id, wait_ms, dur_ms, size_bytes, streamed, streamed_chunks, streamed_bytes, avg_chunk_ms, avg_chunk_bytes, chunk_ms_p50, chunk_ms_p95, chunk_ms_max, chunk_bytes_p50, chunk_bytes_p95, chunk_bytes_max, rss_delta, heap_used_delta, attempt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (job_id) DO NOTHING`,
      row.jobId, row.waitMs, row.dur, row.size, row.streamed, row.streamedChunks, row.streamedBytes, row.avgChunkMs, row.avgChunkBytes,
      row.chunkMsP50, row.chunkMsP95, row.chunkMsMax, row.chunkBytesP50, row.chunkBytesP95, row.chunkBytesMax, row.rssDelta, row.heapUsedDelta, row.attempt
    );
  } catch (e) {
    logger.warn({ jobId: row.jobId, err: (e as any)?.message }, 'export.perf.persist.failed'); // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}
const MAX_RETRIES = 3;
function computeBackoffMs(attempt: number) { return Math.min(30000, 500 * 2 ** attempt); }
async function workerLoop() {
  const INTERVAL_MS = Number(process.env.EXPORT_WORKER_INTERVAL_MS) || 200; // configurable fast loop for tests
  const BATCH_LIMIT = 5; // process up to 5 jobs per tick to reduce backlog during test bursts
  try {
    // Recover stale running jobs (e.g. if process crashed mid-build or long synchronous task hung) so tests don't timeout.
    // Any job stuck in 'running' past the stale threshold will be re-queued with an incremented attempt count (up to MAX_RETRIES).
    const STALE_RUNNING_MS = 15_000; // 15s should be far above normal build time for current datasets
    try {
      const staleCutoff = new Date(Date.now() - STALE_RUNNING_MS);
      // Using updateMany with increment for attemptCount
      await prisma.exportJob.updateMany({
        where: { status: 'running', startedAt: { lt: staleCutoff }, attemptCount: { lt: MAX_RETRIES } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        data: { status: 'queued', nextAttemptAt: new Date(), error: 'Recovered stale running job', attemptCount: { increment: 1 } } as any // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } catch { /* ignore stale recovery errors */ }
    let processedThisTick = 0;
    while (processedThisTick < BATCH_LIMIT) {
      const now = new Date();
      const next = await prisma.exportJob.findFirst({ where: { status: 'queued', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] } as any, orderBy: { createdAt: 'asc' } }); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!next) break;
      const waitMs = Date.now() - next.createdAt.getTime();
      const correlationId = next.id; // reuse job id as correlation id for now
      await markJobRunning(next.id);
      persistMetrics.running++;
  const requestId = (next as any).requestId; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const start = Date.now();
        const memBefore = process.memoryUsage();
  logger.info({ jobId: next.id, correlationId, requestId, type: next.type, format: next.format, attempt: (next as any).attemptCount, waitMs, queuedAt: next.createdAt, workerPid: process.pid }, 'export.job.started'); // eslint-disable-line @typescript-eslint/no-explicit-any
  type WorkerExportType = 'trades' | 'goals' | 'dailyPnl' | 'tagPerformance' | 'chartEquity' | 'propEvaluation';
  type WorkerExportFormat = 'csv' | 'json' | 'xlsx' | 'png';
  const built = await runInSpan(
    'export.build',
    { jobId: next.id, userId: next.userId, type: next.type, format: next.format, attempt: (next as any).attemptCount }, // eslint-disable-line @typescript-eslint/no-explicit-any
    async () => await buildExport(next.userId, next.type as WorkerExportType, next.format as WorkerExportFormat, (next.paramsJson as unknown) as Record<string, unknown>)
  );
        let raw: Buffer;
        let streamed = false;
        let streamedChunks = 0;
        let streamedBytes = 0;
        let streamChunkDurTotal = 0;
        const chunkDurations: number[] = [];
        const chunkSizes: number[] = [];
        if (built.data instanceof Buffer) {
          raw = built.data;
        } else if (typeof built.data === 'string') {
          raw = Buffer.from(built.data);
        } else if (built.data && Symbol.asyncIterator in (built.data as any)) { // eslint-disable-line @typescript-eslint/no-explicit-any
          streamed = true;
          const limitBytes = getExportMemorySoftLimitMB() * 1024 * 1024;
          const chunks: Buffer[] = [];
          let prevT = Date.now();
          for await (const chunk of built.data as AsyncGenerator<string>) {
            const buf = Buffer.from(chunk);
            streamedChunks++;
            streamedBytes += buf.length;
            chunkSizes.push(buf.length);
            // Guard: abort if exceeding soft memory limit (prevents unbounded growth if threshold misconfigured)
            if (streamedBytes > limitBytes) {
              throw new Error(`Export memory soft limit exceeded (${streamedBytes} > ${limitBytes} bytes)`);
            }
            chunks.push(buf);
            const nowT = Date.now();
            const seg = (nowT - prevT);
            streamChunkDurTotal += seg;
            chunkDurations.push(seg);
            prevT = nowT;
          }
          raw = Buffer.concat(chunks);
        } else {
          raw = Buffer.from('');
        }
        await markJobCompleted(next.id, { filename: built.filename, contentType: built.contentType, payloadBase64: raw.toString('base64') });
        const dur = Date.now() - start;
        const memAfter = process.memoryUsage();
        const rssDelta = memAfter.rss - memBefore.rss;
        const heapUsedDelta = memAfter.heapUsed - memBefore.heapUsed;
        const avgChunkMs = streamed && streamedChunks ? Number((streamChunkDurTotal / streamedChunks).toFixed(2)) : 0;
        const avgChunkBytes = streamed && streamedChunks ? Math.round(streamedBytes / streamedChunks) : 0;
        function pct(arr: number[], p: number) { if (!arr.length) return 0; const sorted = [...arr].sort((a,b)=>a-b); const idx = Math.min(sorted.length - 1, Math.floor((p/100)* (sorted.length - 1))); return sorted[idx]; }
        const chunkMsP50 = pct(chunkDurations, 50);
        const chunkMsP95 = pct(chunkDurations, 95);
        const chunkMsMax = chunkDurations.length ? Math.max(...chunkDurations) : 0;
        const chunkBytesP50 = pct(chunkSizes, 50);
        const chunkBytesP95 = pct(chunkSizes, 95);
        const chunkBytesMax = chunkSizes.length ? Math.max(...chunkSizes) : 0;
        logger.info({
          jobId: next.id,
          correlationId,
          requestId,
          type: next.type,
          format: next.format,
          attempt: (next as any).attemptCount, // eslint-disable-line @typescript-eslint/no-explicit-any
          workerPid: process.pid,
          waitMs,
          dur,
          size: raw.length,
          streamed,
          streamedChunks,
          streamedBytes,
          avgChunkMs,
          avgChunkBytes,
          chunkMsP50,
          chunkMsP95,
          chunkMsMax,
          chunkBytesP50,
          chunkBytesP95,
          chunkBytesMax,
          rssBefore: memBefore.rss,
          rssAfter: memAfter.rss,
          rssDelta,
          heapUsedBefore: memBefore.heapUsed,
          heapUsedAfter: memAfter.heapUsed,
          heapUsedDelta
        }, 'export.job.completed');
        // Persist performance row (best effort)
        persistJobPerformance({
          jobId: next.id,
          waitMs,
          dur,
          size: raw.length,
          streamed,
          streamedChunks,
          streamedBytes,
          avgChunkMs,
          avgChunkBytes,
          chunkMsP50,
          chunkMsP95,
          chunkMsMax,
          chunkBytesP50,
          chunkBytesP95,
          chunkBytesMax,
          rssDelta,
          heapUsedDelta,
          attempt: (next as any).attemptCount // eslint-disable-line @typescript-eslint/no-explicit-any
        }).catch(()=>{});
        persistMetrics.lastDurationsMs.push(dur);
        if (persistMetrics.lastDurationsMs.length > 20) persistMetrics.lastDurationsMs.shift();
        persistMetrics.processed++;
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'error';
        captureException(e, { jobId: next.id, userId: next.userId, type: next.type, format: next.format, attempt: (next as any).attemptCount, requestId }); // eslint-disable-line @typescript-eslint/no-explicit-any
        logger.error({ jobId: next.id, correlationId, requestId, type: next.type, format: next.format, attempt: (next as any).attemptCount, workerPid: process.pid, err: msg, waitMs }, 'export.job.failed'); // eslint-disable-line @typescript-eslint/no-explicit-any
        const isMemorySoftLimit = msg.toLowerCase().includes('memory soft limit exceeded');
        if (isMemorySoftLimit) {
          await markJobFailed(next.id, msg);
          persistMetrics.failed++;
        } else if ((next as any).attemptCount < MAX_RETRIES - 1) { // eslint-disable-line @typescript-eslint/no-explicit-any
          const attempt = (next as any).attemptCount + 1; // eslint-disable-line @typescript-eslint/no-explicit-any
          const backoff = computeBackoffMs(attempt);
          await prisma.exportJob.update({ where: { id: next.id }, data: { status: 'queued', attemptCount: attempt, nextAttemptAt: new Date(Date.now() + backoff), error: msg } as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
          persistMetrics.retried++;
        } else {
          await markJobFailed(next.id, msg);
          persistMetrics.failed++;
        }
        // Safety fallback: if for any reason the job remains stuck in 'running' (e.g. update race/failed update), mark failed to prevent indefinite running state.
        try {
          const current = await prisma.exportJob.findUnique({ where: { id: next.id } });
          if (current?.status === 'running') {
            await markJobFailed(next.id, msg || 'Unknown failure');
            persistMetrics.failed++;
          }
        } catch { /* ignore */ }
      } finally {
        persistMetrics.running = Math.max(0, persistMetrics.running - 1);
        processedThisTick++;
      }
    }
  } catch { /* swallow */ }
  setTimeout(workerLoop, INTERVAL_MS).unref?.();
  pruneOldPerformanceRows().catch(()=>{});
}

export function ensureExportWorker() {
  if (workerStarted) return;
  if (process.env.ENABLE_EXPORTS !== '1') return; // unified feature flag gate
  workerStarted = true;
  workerLoop();
}

// Auto-start if unified flag enabled.
if (process.env.ENABLE_EXPORTS === '1') {
  ensureExportWorker();
}

export function getPersistExportMetrics() {
  const durations = persistMetrics.lastDurationsMs.slice();
  const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  return { processed: persistMetrics.processed, failed: persistMetrics.failed, running: persistMetrics.running, retried: persistMetrics.retried, avgDurationMs: avgMs, samples: durations.length };
}
