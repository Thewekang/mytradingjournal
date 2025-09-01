import { prisma } from '@/lib/prisma';
import type { ExportJob, Prisma } from '@prisma/client';
import { buildExport } from '@/lib/export/builders';
// Service helpers for persistent export job queue.

export type PersistedExportJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface CreateExportJobInput {
  userId: string;
  type: string;
  format: string;
  params: Record<string, unknown>;
}

export async function createExportJob(input: CreateExportJobInput): Promise<ExportJob> {
  return prisma.exportJob.create({ data: { userId: input.userId, type: input.type, format: input.format, paramsJson: input.params as Prisma.InputJsonValue, status: 'queued' } });
}

export async function getExportJob(id: string, userId: string): Promise<ExportJob | null> {
  return prisma.exportJob.findFirst({ where: { id, userId } });
}

export async function listExportJobs(userId: string, limit = 50): Promise<ExportJob[]> {
  return prisma.exportJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
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
const MAX_RETRIES = 3;
function computeBackoffMs(attempt: number) { return Math.min(30000, 500 * 2 ** attempt); }
async function workerLoop() {
  const INTERVAL_MS = 200; // faster in-process loop for responsiveness in tests
  try {
    const now = new Date();
  // nextAttemptAt / attemptCount added in latest migration; cast to any until Prisma client regenerated.
  const next = await prisma.exportJob.findFirst({ where: { status: 'queued', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] } as any, orderBy: { createdAt: 'asc' } }); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (next) {
      await markJobRunning(next.id);
      persistMetrics.running++;
      try {
        const start = Date.now();
        const built = await buildExport(next.userId, next.type as 'trades' | 'goals' | 'dailyPnl' | 'tagPerformance', next.format as 'csv' | 'json' | 'xlsx', (next.paramsJson as unknown) as Record<string, unknown>);
        const raw = built.data instanceof Buffer ? built.data : Buffer.from(built.data);
        const payloadBase64 = raw.toString('base64');
        await markJobCompleted(next.id, { filename: built.filename, contentType: built.contentType, payloadBase64 });
        const dur = Date.now() - start;
        persistMetrics.lastDurationsMs.push(dur);
        if (persistMetrics.lastDurationsMs.length > 20) persistMetrics.lastDurationsMs.shift();
        persistMetrics.processed++;
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'error';
  if ((next as any).attemptCount < MAX_RETRIES - 1) { // eslint-disable-line @typescript-eslint/no-explicit-any
          // schedule retry with backoff
          const attempt = (next as any).attemptCount + 1; // eslint-disable-line @typescript-eslint/no-explicit-any
          const backoff = computeBackoffMs(attempt);
          await prisma.exportJob.update({ where: { id: next.id }, data: { status: 'queued', attemptCount: attempt, nextAttemptAt: new Date(Date.now() + backoff), error: msg } as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
          persistMetrics.retried++;
        } else {
          await markJobFailed(next.id, msg);
          persistMetrics.failed++;
        }
      } finally {
        persistMetrics.running = Math.max(0, persistMetrics.running - 1);
      }
    }
  } catch { /* swallow */ }
  setTimeout(workerLoop, INTERVAL_MS).unref?.();
}

export function ensureExportWorker() {
  if (workerStarted) return;
  if (process.env.ENABLE_PERSIST_EXPORT !== '1') return; // feature flag gate
  workerStarted = true;
  workerLoop();
}

// Auto-start if flag enabled (runtime usage). Tests may call ensureExportWorker explicitly.
if (process.env.ENABLE_PERSIST_EXPORT === '1') {
  ensureExportWorker();
}

export function getPersistExportMetrics() {
  const durations = persistMetrics.lastDurationsMs.slice();
  const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  return { processed: persistMetrics.processed, failed: persistMetrics.failed, running: persistMetrics.running, retried: persistMetrics.retried, avgDurationMs: avgMs, samples: durations.length };
}
