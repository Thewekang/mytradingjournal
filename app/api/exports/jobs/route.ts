import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createJob, listJobs } from '@/lib/export/queue';

export async function GET(){
  if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response('Export queue disabled', { status: 501 });
  const session = await getServerSession(authOptions); const userId = (session?.user as any)?.id as string | undefined; if(!userId) return new Response('Unauthorized',{status:401});
  return new Response(JSON.stringify({ jobs: listJobs(userId) }), { status:200, headers:{'Content-Type':'application/json'} });
}

export async function POST(request: Request){
  if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response('Export queue disabled', { status: 501 });
  const session = await getServerSession(authOptions); const userId = (session?.user as any)?.id as string | undefined; if(!userId) return new Response('Unauthorized',{status:401});
  const body = await request.json().catch(()=>({}));
  const type = body.type as any; const format = (body.format||'csv') as any;
  const allowedTypes = ['trades','goals','dailyPnl','tagPerformance'];
  const allowedFormats = ['csv']; // future: json, xlsx
  if(!allowedTypes.includes(type)) return new Response('Invalid type',{status:400});
  if(!allowedFormats.includes(format)) return new Response('Invalid format',{status:400});
  const job = createJob(userId, type, format, body.params||{});
  return new Response(JSON.stringify({ job }), { status:202, headers:{'Content-Type':'application/json'} });
}
