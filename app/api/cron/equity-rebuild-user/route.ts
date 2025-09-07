import { rebuildDailyEquity } from '@/lib/services/daily-equity-service';
import { authorizeCron } from '@/lib/cron/auth';
import { prisma } from '@/lib/prisma';
import { recordCronRun } from '@/lib/cron/log';

// POST { userId: string, fromDate?: string } -> rebuild specific user (optionally incremental from date)
export async function POST(req: Request){
  const auth = await authorizeCron(req);
  if(!auth.authorized) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(()=>({}));
  const userId = body.userId as string | undefined;
  if(!userId) return Response.json({ error: 'userId required' }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if(!exists) return Response.json({ error: 'not_found' }, { status: 404 });
  const fromDate = body.fromDate ? new Date(body.fromDate) : undefined;
  const started = Date.now();
  try {
    const rows = await rebuildDailyEquity(userId, fromDate);
    const dur = Date.now() - started;
    recordCronRun('equity-rebuild-user', 'success', dur, `user=${userId} rows=${rows.length}`).catch(()=>{});
    return Response.json({ data: { userId, rebuiltRows: rows.length, fromDate: fromDate?.toISOString(), durationMs: dur } });
  } catch (e){
    const dur = Date.now() - started;
    recordCronRun('equity-rebuild-user', 'failure', dur, (e as any)?.message).catch(()=>{}); // eslint-disable-line @typescript-eslint/no-explicit-any
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
