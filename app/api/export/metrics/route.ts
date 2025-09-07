import { getPersistExportMetrics, ensureExportWorker } from '@/lib/services/export-job-service';

export async function GET() {
  if (process.env.ENABLE_EXPORTS !== '1') {
    return Response.json({ error: 'disabled' }, { status: 404 });
  }
  // Ensure worker running in case API hit before any test/bootstrap called it.
  ensureExportWorker();
  const metrics = getPersistExportMetrics();
  return Response.json({ data: metrics });
}
