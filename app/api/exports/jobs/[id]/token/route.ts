import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getExportJob, updateExportJobTokenMeta } from '@/lib/services/export-job-service';
import crypto from 'crypto';
import { withLogging } from '@/lib/api/logger-wrapper';

async function _POST(req: Request, { params }: { params: { id: string } }) {
  if(process.env.ENABLE_EXPORTS !== '1') return new Response('Exports disabled', { status: 501 });
  const session = await getServerSession(authOptions); const userId = (session?.user as { id?: string }|undefined)?.id; if(!userId) return new Response('Unauthorized',{status:401});
  const job = await getExportJob(params.id, userId);
  if(!job) return new Response('Not found',{status:404});
  if(job.status !== 'completed' || !job.filename) return new Response('Not ready',{status:409});
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await updateExportJobTokenMeta(job.id, { downloadTokenExpiresAt: expiresAt, downloadTokenConsumedAt: null });
  const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
  const token = crypto.createHmac('sha256', secret).update(job.id + '|' + expiresAt.getTime()).digest('hex').slice(0,32);
  return new Response(JSON.stringify({ data: { id: job.id, downloadToken: token, tokenExpiresAt: expiresAt.getTime() }, error: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export const POST = withLogging(_POST as any, 'POST /api/exports/jobs/[id]/token'); // eslint-disable-line @typescript-eslint/no-explicit-any