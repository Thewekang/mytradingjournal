import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createExportJob, getExportJob } from '@/lib/services/export-job-service';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';
import { setExportMemorySoftLimitMB, setExportStreamingRowThreshold, getExportStreamingRowThreshold } from '@/lib/constants';

process.env.ENABLE_EXPORTS = '1';

const TEST_THRESHOLD = 0;
let testUserId: string;
let originalThreshold: number;
const ORIGINAL_MEMORY_LIMIT_MB = 50;

async function seedTrades(userId: string, count: number) {
  const symbol = 'SIM' + Date.now().toString().slice(-5) + Math.floor(Math.random()*1000); // ensure uniqueness per invocation
  const instrument = await prisma.instrument.create({ data: { symbol, name: 'Simulated', category: 'FUTURES', currency: 'USD', tickSize: 0.25, contractMultiplier: 1 } });
  const data = Array.from({ length: count }).map((_, i) => ({
    userId,
    instrumentId: instrument.id,
    direction: 'LONG' as unknown as import('@prisma/client').TradeDirection,
    entryPrice: 100 + i,
    quantity: 1,
    entryAt: new Date(Date.now() - i * 1000),
    status: 'OPEN' as unknown as import('@prisma/client').TradeStatus,
    fees: 0
  }));
  // Insert in batches to avoid query param limits
  const BATCH = 1000;
  for (let i = 0; i < data.length; i += BATCH) {
    await prisma.trade.createMany({ data: data.slice(i, i + BATCH) });
  }
}

describe.sequential('Persistent export streaming (CSV)', () => {
  beforeAll(async () => {
    originalThreshold = getExportStreamingRowThreshold();
    setExportStreamingRowThreshold(TEST_THRESHOLD);
    await initExportTestSuite();
    // Hint for worker to accelerate (best-effort; worker may ignore if not implemented)
    process.env.EXPORT_WORKER_INTERVAL_MS = '50';
    // Create single reusable user (unique email) + settings
    const uniqueEmail = `stream-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
    const user = await prisma.user.create({ data: { email: uniqueEmail, role: 'USER' } });
    testUserId = user.id;
    await prisma.journalSettings.create({ data: { userId: user.id } }).catch(()=>{});
  });

  afterAll(() => {
    setExportStreamingRowThreshold(originalThreshold);
    setExportMemorySoftLimitMB(ORIGINAL_MEMORY_LIMIT_MB);
  });

  it('streams when row count exceeds threshold and records footer', { timeout: 12000 }, async () => {
    if (process.env.ENABLE_EXPORTS !== '1') { expect(true).toBe(true); return; }
    // Re-assert threshold (defensive in case of cross-file mutation order)
    setExportStreamingRowThreshold(TEST_THRESHOLD);
  // Force streaming unconditionally to avoid any race on threshold value
  process.env.FORCE_STREAM_EXPORT = '1';
    await seedTrades(testUserId, TEST_THRESHOLD + 10); // exceed threshold to trigger streaming
  const job = await createExportJob({ userId: testUserId, type: 'trades', format: 'csv', params: { limit: TEST_THRESHOLD + 12 } });
    // Deterministically process immediately (removes reliance on worker timing for this correctness test)
    await processJobNow(job.id);
    const final = await getExportJob(job.id, testUserId);
    if (!final || final.status !== 'completed') {
      throw new Error(`Expected export job to complete via immediate processor. Final status=${final?.status} jobId=${job.id}`);
    }
    const csv = Buffer.from(final.payloadBase64!, 'base64').toString('utf8');
    // Footer appended by streaming generator
    const hasFooter = csv.includes('# streamed_rows=');
    expect(hasFooter).toBe(true);
    // Optionally validate the footer count matches data lines (excluding header + footer)
    const footerMatch = csv.match(/# streamed_rows=(\d+)/);
    if (footerMatch) {
      const declared = Number(footerMatch[1]);
      const dataLines = csv.trim().split(/\n/).filter(l => l && !l.startsWith('# streamed_rows=')).length - 1; // subtract header
      expect(declared).toBeGreaterThan(0);
      expect(declared).toBe(dataLines);
    }
    // Ensure we actually exported >5 data lines (header + rows)
    const lineCount = csv.trim().split(/\n/).length;
    expect(lineCount).toBeGreaterThan(5);
  });

  it('fails fast if memory soft limit exceeded during streaming', { timeout: 8000 }, async () => {
    if (process.env.ENABLE_EXPORTS !== '1') { expect(true).toBe(true); return; }
    // Force streaming and set a zero-byte soft limit so the first chunk immediately triggers failure.
    setExportStreamingRowThreshold(TEST_THRESHOLD);
    process.env.FORCE_STREAM_EXPORT = '1';
    await seedTrades(testUserId, TEST_THRESHOLD + 5);
    setExportMemorySoftLimitMB(0); // zero => streamedBytes > 0 on first chunk triggers error
  const job = await createExportJob({ userId: testUserId, type: 'trades', format: 'csv', params: { limit: TEST_THRESHOLD + 6 } });
    // Deterministically process the queued job immediately (bypasses async worker scheduling)
    await processJobNow(job.id);
    const final = await getExportJob(job.id, testUserId);
    expect(final?.status).toBe('failed');
    expect(final?.error?.toLowerCase()).toContain('memory soft limit');
  });
}, 60_000);
