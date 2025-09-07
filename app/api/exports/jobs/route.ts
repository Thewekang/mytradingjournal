import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createExportJob, listExportJobs, listExportJobsByRequest, updateExportJobTokenMeta } from '@/lib/services/export-job-service';
import crypto from 'crypto';
import { ResponseEnvelope, ExportJobDTO } from '@/types/api';
import { withLogging } from '@/lib/api/logger-wrapper';
import { exportCreateSchema } from '@/lib/api/validation';
import { apiError } from '@/lib/api/errors';

async function _GET(request: Request){
  if(process.env.ENABLE_EXPORTS!=='1') return apiError('DISABLED','Export exports disabled',501);
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return apiError('UNAUTHORIZED','Sign in',401);
  // Persistent queue is now the only supported mode (guarded by ENABLE_EXPORTS)
  if(process.env.ENABLE_EXPORTS!=='1') return apiError('DISABLED','Persistent export mode required',501);
  const url = new URL(request.url);
  const filterReqId = url.searchParams.get('requestId') || undefined;
  const jobs = filterReqId ? await listExportJobsByRequest(userId, filterReqId, 100) : await listExportJobs(userId,100);
  const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const dto: ExportJobDTO[] = jobs.map((j: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const token = crypto.createHmac('sha256', secret).update(j.id + '|' + (j.downloadTokenExpiresAt?.getTime() || 'none')).digest('hex').slice(0,32);
  return { id:j.id, type:j.type, format:j.format, status: j.status as ExportJobDTO['status'], createdAt:j.createdAt.getTime(), startedAt:j.startedAt?.getTime(), completedAt:j.completedAt?.getTime(), error:j.error||undefined, filename:j.filename||undefined, downloadToken: token, tokenExpiresAt: j.downloadTokenExpiresAt?.getTime(), tokenConsumed: !!j.downloadTokenConsumedAt, requestId: j.requestId || undefined };
  });
  return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDTO[]>), { status:200, headers:{'Content-Type':'application/json','X-Export-Queue-Mode':'persistent'} });
}

export const GET = withLogging(_GET as any, 'GET /api/exports/jobs'); // eslint-disable-line @typescript-eslint/no-explicit-any

async function _POST(request: Request){
  if(process.env.ENABLE_EXPORTS!=='1') return apiError('DISABLED','Export exports disabled',501);
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return apiError('UNAUTHORIZED','Sign in',401);
  // Best-effort request id propagation (middleware sets x-request-id; fall back to header or none)
  const reqId = request.headers.get('x-request-id') || request.headers.get('x-requestid') || undefined;
  const jsonBody: unknown = await request.json().catch(()=>({}));
  const objRaw = (jsonBody || {}) as Record<string, unknown>;
  const type = objRaw.type ?? 'trades';
  const format = objRaw.format ?? (type==='chartEquity' ? 'png' : 'csv');
  const parsed = exportCreateSchema.safeParse({ type, format, limit: objRaw.limit });
  if(!parsed.success){
    const first = parsed.error.issues[0];
    return apiError('INVALID_REQUEST', first?.message || 'Invalid request body', 400);
  }
  const obj = { type: parsed.data.type, format: parsed.data.format, params: (objRaw.params as Record<string, unknown>) || {} };
  // Normalize selectedColumns for trades
  if(obj.type === 'trades' && obj.params && Array.isArray((obj.params as { selectedColumns?: unknown[] }).selectedColumns)) {
    (obj.params as { selectedColumns?: unknown[] }).selectedColumns = (obj.params as { selectedColumns?: unknown[] }).selectedColumns?.filter((c: unknown) => typeof c === 'string');
  }
  const fmt = obj.format;
  // Basic per-user queued job cap (excluding completed/failed)
  if(process.env.ENABLE_EXPORTS!=='1') return apiError('DISABLED','Persistent export mode required',501);
  {
    const activeCount = await (async()=>{
      try { return await (await import('@/lib/prisma')).prisma.exportJob.count({ where:{ userId, status:{ in:['queued','running'] } } }); } catch { return 0; }
    })();
    const MAX_ACTIVE = 5;
  if(activeCount >= MAX_ACTIVE) return apiError('RATE_LIMIT',`Max ${MAX_ACTIVE} active export jobs reached`,429);
  }
  const job = await createExportJob({ userId, type: obj.type, format: fmt, params: (obj.params as Record<string, unknown>)||{}, requestId: reqId });
  // set expiry (default 10 min) on creation
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await updateExportJobTokenMeta(job.id, { downloadTokenExpiresAt: expiresAt, downloadTokenConsumedAt: null });
  const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const token = crypto.createHmac('sha256', secret).update(job.id + '|' + expiresAt.getTime()).digest('hex').slice(0,32);
  const dto: ExportJobDTO = { id:job.id, type:job.type, format:job.format, status: job.status as ExportJobDTO['status'], createdAt:job.createdAt.getTime(), startedAt:job.startedAt?.getTime(), completedAt:job.completedAt?.getTime(), error:job.error||undefined, filename:job.filename||undefined, downloadToken: token, tokenExpiresAt: expiresAt.getTime(), tokenConsumed: false, requestId: job.requestId } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDTO>), { status:202, headers:{'Content-Type':'application/json','X-Export-Queue-Mode':'persistent'} });
}

export const POST = withLogging(_POST, 'POST /api/exports/jobs');
