import { rebuildAllDailyEquity } from '@/lib/services/daily-equity-service';
import { authorizeCron } from '@/lib/cron/auth';
import { recordCronRun } from '@/lib/cron/log';

// POST only (protected admin). In production would secure via secret header / internal auth.
export async function POST(req: Request){
  const auth = await authorizeCron(req);
  if(!auth.authorized) return Response.json({ error: auth.reason || 'unauthorized' }, { status: 401 });
  const started = Date.now();
  try {
    const results = await rebuildAllDailyEquity();
    const dur = Date.now() - started;
    recordCronRun('equity-rebuild-all', 'success', dur, `users=${Object.keys(results).length}`).catch(()=>{});
    return Response.json({ data: { rebuiltUsers: Object.keys(results).length, rowCounts: results, durationMs: dur } });
  } catch (e){
    const dur = Date.now() - started;
    recordCronRun('equity-rebuild-all', 'failure', dur, (e as any)?.message).catch(()=>{}); // eslint-disable-line @typescript-eslint/no-explicit-any
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
