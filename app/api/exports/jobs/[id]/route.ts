import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getJob } from '@/lib/export/queue';
import { getExportJob } from '@/lib/services/export-job-service';
import { RouteContext } from '@/lib/api/params';
import { ResponseEnvelope, ExportJobDetailDTO } from '@/types/api';
import { withLogging } from '@/lib/api/logger-wrapper';

async function _GET(_req: Request, { params }: RouteContext<{ id: string }>) {
  if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response(JSON.stringify({ data:null, error:{ code:'DISABLED', message:'Export queue disabled'} } as ResponseEnvelope<ExportJobDetailDTO>), { status: 501 });
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return new Response(JSON.stringify({ data:null, error:{ code:'UNAUTHORIZED', message:'Sign in'} } as ResponseEnvelope<ExportJobDetailDTO>), {status:401});
  if(process.env.ENABLE_PERSIST_EXPORT==='1'){
    const job = await getExportJob(params.id, userId);
    if(!job) return new Response(JSON.stringify({ data:null, error:{ code:'NOT_FOUND', message:'Not found'} } as ResponseEnvelope<ExportJobDetailDTO>), {status:404});
  const dto: ExportJobDetailDTO = { id:job.id, type:job.type, format:job.format, status: job.status as ExportJobDetailDTO['status'], createdAt:job.createdAt.getTime(), startedAt:job.startedAt?.getTime(), completedAt:job.completedAt?.getTime(), error:job.error||undefined, filename:job.filename||undefined, contentType:job.contentType||undefined, payloadBase64:job.payloadBase64||undefined };
    return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDetailDTO>), { status:200, headers:{'Content-Type':'application/json'} });
  }
  const job = getJob(params.id); if(!job || job.userId!==userId) return new Response(JSON.stringify({ data:null, error:{ code:'NOT_FOUND', message:'Not found'} } as ResponseEnvelope<ExportJobDetailDTO>), {status:404});
  const dto: ExportJobDetailDTO = { id:job.id, type:job.type, format:job.format, status:job.status, createdAt:job.createdAt, startedAt:job.startedAt, completedAt:job.completedAt, error:job.error, filename:job.filename, contentType:job.contentType, payloadBase64:job.payloadBase64 };
  return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDetailDTO>), { status:200, headers:{'Content-Type':'application/json'} });
}
export const GET = withLogging(_GET as any, 'GET /api/exports/jobs/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
