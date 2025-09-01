import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createJob, listJobs, ExportJob } from '@/lib/export/queue';
import { createExportJob, listExportJobs, updateExportJobTokenMeta } from '@/lib/services/export-job-service';
import crypto from 'crypto';
import { ResponseEnvelope, ExportJobDTO } from '@/types/api';
import { withLogging } from '@/lib/api/logger-wrapper';

async function _GET(){
  if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response(JSON.stringify({ data: null, error: { code:'DISABLED', message:'Export queue disabled' } } as ResponseEnvelope<ExportJobDTO[]>), { status: 501 });
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return new Response(JSON.stringify({ data:null, error:{ code:'UNAUTHORIZED', message:'Sign in' } } as ResponseEnvelope<ExportJobDTO[]>), {status:401});
  if(process.env.ENABLE_PERSIST_EXPORT==='1'){
  const jobs = await listExportJobs(userId,100);
  const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const dto: ExportJobDTO[] = jobs.map((j: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const token = crypto.createHmac('sha256', secret).update(j.id + '|' + (j.downloadTokenExpiresAt?.getTime() || 'none')).digest('hex').slice(0,32);
    return { id:j.id, type:j.type, format:j.format, status: j.status as ExportJobDTO['status'], createdAt:j.createdAt.getTime(), startedAt:j.startedAt?.getTime(), completedAt:j.completedAt?.getTime(), error:j.error||undefined, filename:j.filename||undefined, downloadToken: token, tokenExpiresAt: j.downloadTokenExpiresAt?.getTime(), tokenConsumed: !!j.downloadTokenConsumedAt };
  });
    return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDTO[]>), { status:200, headers:{'Content-Type':'application/json'} });
  } else {
    const jobs = listJobs(userId);
    const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const dto: ExportJobDTO[] = jobs.map(j => ({ id:j.id, type:j.type, format:j.format, status:j.status, createdAt:j.createdAt, startedAt:j.startedAt, completedAt:j.completedAt, error:j.error, filename:j.filename, downloadToken: crypto.createHmac('sha256', secret).update(j.id).digest('hex').slice(0,32), attemptCount: (j as any).attemptCount })); // eslint-disable-line @typescript-eslint/no-explicit-any
    return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDTO[]>), { status:200, headers:{'Content-Type':'application/json'} });
  }
}

export const GET = withLogging(_GET, 'GET /api/exports/jobs');

async function _POST(request: Request){
  if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response(JSON.stringify({ data: null, error: { code:'DISABLED', message:'Export queue disabled' } } as ResponseEnvelope<ExportJobDTO>), { status: 501 });
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return new Response(JSON.stringify({ data:null, error:{ code:'UNAUTHORIZED', message:'Sign in' } } as ResponseEnvelope<ExportJobDTO>), {status:401});
  const body: unknown = await request.json().catch(()=>({}));
  const allowedTypes = ['trades','goals','dailyPnl','tagPerformance'] as const;
  const allowedFormats = ['csv','json','xlsx'] as const;
  type AllowedType = typeof allowedTypes[number];
  type AllowedFormat = typeof allowedFormats[number];
  const obj = body as { type?: string; format?: string; params?: Record<string, unknown> };
  // Normalize params: if trades & selectedColumns present ensure array of strings
  if(obj.type === 'trades' && obj.params && Array.isArray((obj.params as any).selectedColumns)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    (obj.params as any).selectedColumns = (obj.params as any).selectedColumns.filter((c: unknown) => typeof c === 'string'); // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  if(!obj.type || !allowedTypes.includes(obj.type as AllowedType)) return new Response(JSON.stringify({ data:null, error:{ code:'INVALID_TYPE', message:'Invalid export type'} } as ResponseEnvelope<ExportJobDTO>), {status:400});
  const fmt = (obj.format || 'csv');
  if(!allowedFormats.includes(fmt as AllowedFormat)) return new Response(JSON.stringify({ data:null, error:{ code:'INVALID_FORMAT', message:'Invalid format'} } as ResponseEnvelope<ExportJobDTO>), {status:400});
  // Basic per-user queued job cap (excluding completed/failed)
  if(process.env.ENABLE_PERSIST_EXPORT==='1'){
    const activeCount = await (async()=>{
      try { return await (await import('@/lib/prisma')).prisma.exportJob.count({ where:{ userId, status:{ in:['queued','running'] } } }); } catch { return 0; }
    })();
    const MAX_ACTIVE = 5;
    if(activeCount >= MAX_ACTIVE) return new Response(JSON.stringify({ data:null, error:{ code:'RATE_LIMIT', message:`Max ${MAX_ACTIVE} active export jobs reached` } } as ResponseEnvelope<ExportJobDTO>), {status:429});
  }
  if(process.env.ENABLE_PERSIST_EXPORT==='1'){
  const job = await createExportJob({ userId, type: obj.type, format: fmt, params: (obj.params as Record<string, unknown>)||{} });
  // set expiry (default 10 min) on creation
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await updateExportJobTokenMeta(job.id, { downloadTokenExpiresAt: expiresAt, downloadTokenConsumedAt: null });
  const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const token = crypto.createHmac('sha256', secret).update(job.id + '|' + expiresAt.getTime()).digest('hex').slice(0,32);
  const dto: ExportJobDTO = { id:job.id, type:job.type, format:job.format, status: job.status as ExportJobDTO['status'], createdAt:job.createdAt.getTime(), startedAt:job.startedAt?.getTime(), completedAt:job.completedAt?.getTime(), error:job.error||undefined, filename:job.filename||undefined, downloadToken: token, tokenExpiresAt: expiresAt.getTime(), tokenConsumed: false } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDTO>), { status:202, headers:{'Content-Type':'application/json'} });
  } else {
  const job: ExportJob = createJob(userId, obj.type as AllowedType, fmt as AllowedFormat, (obj.params as Record<string, unknown>) || {});
  const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const token = crypto.createHmac('sha256', secret).update(job.id).digest('hex').slice(0,32);
  const dto: ExportJobDTO = { id:job.id, type:job.type, format:job.format, status:job.status, createdAt:job.createdAt, startedAt:job.startedAt, completedAt:job.completedAt, error:job.error, filename:job.filename, downloadToken: token };
    return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDTO>), { status:202, headers:{'Content-Type':'application/json'} });
  }
}

export const POST = withLogging(_POST, 'POST /api/exports/jobs');
