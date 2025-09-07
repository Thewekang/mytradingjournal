
import { prisma } from '@/lib/prisma';
import { withLogging } from '@/lib/api/logger-wrapper';
import { getPersistExportMetrics } from '@/lib/services/export-job-service';
import { getAnalyticsCacheStats } from '@/lib/analytics-cache';
import { getObservabilityStatus, initObservability } from '@/lib/observability';

// Simple in-memory metrics (placeholder before OTEL)
const metrics = {
  apiCalls: 0,
  lastApiCallAt: 0,
};

// Monkey patch global fetch counting (only once)
if(!(global as any).__MTJ_METRICS_PATCH__){ // eslint-disable-line @typescript-eslint/no-explicit-any
  const orig = global.fetch;
  global.fetch = async (...args: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    metrics.apiCalls++; metrics.lastApiCallAt = Date.now();
    return orig(...args as [RequestInfo | URL, RequestInit?]);
  };
  (global as any).__MTJ_METRICS_PATCH__ = true; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const startedAt = Date.now();

async function _GET() {
  await initObservability();
  // Basic health data: uptime ms, db ok, migrated models count, optional commit hash
  const uptimeMs = Date.now() - startedAt;
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  try {
    const t0 = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {/* swallow; reported below */}
  const exportMetrics = process.env.ENABLE_EXPORTS === '1'
    ? { mode: 'persistent', queued: await prisma.exportJob.count({ where: { status: 'queued' } }), ...getPersistExportMetrics() }
    : { mode: 'disabled' };
  const cacheStats = getAnalyticsCacheStats();
  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    uptimeMs,
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null,
    metrics: { ...metrics, export: exportMetrics, analyticsCache: cacheStats },
    observability: getObservabilityStatus(),
    timestamp: new Date().toISOString()
  };
  const status = dbOk ? 200 : 503;
  return new Response(JSON.stringify({ data: payload, error: null }), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET = withLogging(_GET, 'GET /api/health');
