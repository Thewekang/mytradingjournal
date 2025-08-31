import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getJob } from '@/lib/export/queue';
import { RouteContext } from '@/lib/api/params';

export async function GET(_req: Request, { params }: RouteContext<{ id: string }>) {
  if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response('Export queue disabled', { status: 501 });
  const session = await getServerSession(authOptions); const userId = (session?.user as any)?.id as string | undefined; if(!userId) return new Response('Unauthorized',{status:401});
  const job = getJob(params.id); if(!job || job.userId!==userId) return new Response('Not found',{status:404});
  return new Response(JSON.stringify({ job }), { status:200, headers:{'Content-Type':'application/json'} });
}
