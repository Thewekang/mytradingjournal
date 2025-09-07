import { pruneOldPerformanceRows } from '@/lib/services/export-job-service';
import { authorizeCron } from '@/lib/cron/auth';
import { recordCronRun } from '@/lib/cron/log';

export async function POST(req: Request){
  const auth = await authorizeCron(req);
  if(!auth.authorized) return Response.json({ error: auth.reason || 'unauthorized' }, { status: 401 });
  const maxAgeDays = Number(process.env.EXPORT_PERF_RETENTION_DAYS || 30);
  const started = Date.now();
  try {
    await pruneOldPerformanceRows(maxAgeDays);
    const dur = Date.now() - started;
    recordCronRun('export-perf-prune', 'success', dur, `maxAgeDays=${maxAgeDays}`).catch(()=>{});
    return Response.json({ data: { prunedOlderThanDays: maxAgeDays, durationMs: dur } });
  } catch (e){
    const dur = Date.now() - started;
    recordCronRun('export-perf-prune', 'failure', dur, (e as any)?.message).catch(()=>{}); // eslint-disable-line @typescript-eslint/no-explicit-any
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
