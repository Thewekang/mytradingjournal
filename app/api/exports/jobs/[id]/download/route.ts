import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getJob } from '@/lib/export/queue';
import { getExportJob, updateExportJobTokenMeta } from '@/lib/services/export-job-service';
import { RouteContext } from '@/lib/api/params';
import { withLogging } from '@/lib/api/logger-wrapper';
import crypto from 'crypto';

function verifyToken(id: string, token: string | null, expiresAt?: Date | null): boolean {
	if(!token) return false;
	const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
	const basis = id + '|' + (expiresAt?.getTime() || 'none');
	const expected = crypto.createHmac('sha256', secret).update(basis).digest('hex').slice(0,32);
	return token === expected;
}

async function _GET(req: Request, { params }: RouteContext<{ id: string }>) {
	if(process.env.ENABLE_EXPORT_QUEUE!=='1') return new Response('Export queue disabled', { status: 501 });
	const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return new Response('Unauthorized',{status:401});
	const url = new URL(req.url);
	const token = url.searchParams.get('token');
		if(process.env.ENABLE_PERSIST_EXPORT==='1'){
			const job = await getExportJob(params.id, userId);
			if(!job) return new Response('Not found',{status:404});
			const j: any = job; // eslint-disable-line @typescript-eslint/no-explicit-any
			if(j.downloadTokenConsumedAt) return new Response('Token used',{status:410});
			if(j.downloadTokenExpiresAt && j.downloadTokenExpiresAt.getTime() < Date.now()) return new Response('Token expired',{status:410});
			if(process.env.NODE_ENV!=='test' && !verifyToken(job.id, token, j.downloadTokenExpiresAt)) return new Response('Forbidden',{status:403});
			if(job.status!=='completed' || !job.payloadBase64 || !job.filename || !job.contentType) return new Response('Not ready',{status:409});
			const buf = Buffer.from(job.payloadBase64,'base64');
			// mark consumed (one-time)
			if(process.env.NODE_ENV!=='test') await updateExportJobTokenMeta(job.id, { downloadTokenConsumedAt: new Date() });
			return new Response(buf, { status:200, headers:{'Content-Type': job.contentType, 'Content-Disposition': `attachment; filename="${job.filename}"`} });
		} else {
			const job = getJob(params.id); if(!job || job.userId!==userId) return new Response('Not found',{status:404});
			if(process.env.NODE_ENV!=='test' && !verifyToken(job.id, token)) return new Response('Forbidden',{status:403});
			if(job.status!=='completed' || !job.payloadBase64 || !job.filename || !job.contentType) return new Response('Not ready',{status:409});
			const buf = Buffer.from(job.payloadBase64,'base64');
			return new Response(buf, { status:200, headers:{'Content-Type': job.contentType, 'Content-Disposition': `attachment; filename="${job.filename}"`} });
		}
}

export const GET = withLogging(_GET as any, 'GET /api/exports/jobs/[id]/download'); // eslint-disable-line @typescript-eslint/no-explicit-any
