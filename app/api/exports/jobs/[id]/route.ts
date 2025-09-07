import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getExportJob } from '@/lib/services/export-job-service';
import { RouteContext } from '@/lib/api/params';
import { ResponseEnvelope, ExportJobDetailDTO } from '@/types/api';
import { withLogging } from '@/lib/api/logger-wrapper';
import { apiError } from '@/lib/api/errors';

async function _GET(_req: Request, { params }: RouteContext<{ id: string }>) {
  if(process.env.ENABLE_EXPORTS!=='1') return apiError('DISABLED','Exports disabled',501);
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return apiError('UNAUTHORIZED','Sign in',401);
  const job = await getExportJob(params.id, userId);
  if(!job) return apiError('NOT_FOUND','Not found',404);
  const dto: ExportJobDetailDTO = { id:job.id, type:job.type, format:job.format, status: job.status as ExportJobDetailDTO['status'], createdAt:job.createdAt.getTime(), startedAt:job.startedAt?.getTime(), completedAt:job.completedAt?.getTime(), error:job.error||undefined, filename:job.filename||undefined, contentType:job.contentType||undefined, payloadBase64:job.payloadBase64||undefined, requestId: job.requestId || undefined } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Response(JSON.stringify({ data: dto, error: null } as ResponseEnvelope<ExportJobDetailDTO>), { status:200, headers:{'Content-Type':'application/json','X-Export-Queue-Mode':'persistent'} });
}
export const GET = withLogging(_GET as any, 'GET /api/exports/jobs/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
