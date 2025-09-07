import { ensureExportWorker, processExportJobImmediate } from '@/lib/services/export-job-service';

// Standard helper to create + immediately process an export job, then return a wait function result if provided.
// This consolidates repeated logic across export tests and enables future adjustments (e.g., metrics hooks) centrally.
export async function initExportTestSuite() {
  ensureExportWorker();
  process.env.ENABLE_EXPORTS = '1';
}

export async function processJobNow(jobId: string) {
  await processExportJobImmediate(jobId);
}
