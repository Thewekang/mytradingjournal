import { authorizeCron } from '@/lib/cron/auth';
import { recentCronRuns } from '@/lib/cron/log';

export async function GET(req: Request){
  const auth = await authorizeCron(req);
  if(!auth.authorized) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const job = url.searchParams.get('job');
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
  const rows = await recentCronRuns(job || undefined, limit);
  return Response.json({ data: rows });
}
