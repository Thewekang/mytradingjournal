import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ensureExportWorker, createExportJob, getPersistExportMetrics } from '@/lib/services/export-job-service';

// Simple metrics smoke test to verify worker updates metrics after processing a job.
describe('export metrics', () => {
  it('processes a job and reports metrics', async () => {
  process.env.ENABLE_EXPORTS = '1';
    ensureExportWorker();
    const userId = 'user-metrics';
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: userId+'@test.local' } });
    // Create a small trades export job (empty dataset acceptable)
    await createExportJob({ userId, type: 'trades', format: 'json', params: {} });
    const start = Date.now();
    let metrics;
    while (Date.now() - start < 5000) { // 5s timeout
      metrics = getPersistExportMetrics();
      if (metrics.processed >= 1) break;
      await new Promise(r => setTimeout(r, 100));
    }
    expect(metrics?.processed).toBeGreaterThanOrEqual(1);
    expect(metrics?.avgDurationMs).toBeGreaterThanOrEqual(0);
  });
});
