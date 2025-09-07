import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { withLogging } from '@/lib/api/logger-wrapper';
import { apiError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';

interface PerfRowDTO {
  jobId: string; waitMs: number; durMs: number; sizeBytes: number; streamed: boolean; streamedChunks: number; streamedBytes: number; avgChunkMs: number; avgChunkBytes: number; attempt: number; createdAt: number;
}

async function _GET(request: Request) {
  if (process.env.ENABLE_EXPORTS !== '1') return apiError('DISABLED','Exports disabled',501);
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return apiError('UNAUTHORIZED','Sign in',401);
  const url = new URL(request.url);
  const limit = Math.min(200, parseInt(url.searchParams.get('limit')||'50',10)||50);
  // Join performance rows with ExportJob for user scoping
  let rows: Array<any> = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    rows = await prisma.$queryRawUnsafe(
      `SELECT p.job_id, p.wait_ms, p.dur_ms, p.size_bytes, p.streamed, p.streamed_chunks, p.streamed_bytes, p.avg_chunk_ms, p.avg_chunk_bytes, p.attempt, p.created_at
       FROM "ExportJobPerformance" p
       JOIN "ExportJob" j ON j.id = p.job_id
       WHERE j.userId = $1
       ORDER BY p.created_at DESC
       LIMIT ${limit}`,
      userId
    );
  } catch {
    rows = [];
  }
  const dto: PerfRowDTO[] = rows.map(r => ({
    jobId: r.job_id,
    waitMs: Number(r.wait_ms)||0,
    durMs: Number(r.dur_ms)||0,
    sizeBytes: Number(r.size_bytes)||0,
    streamed: !!r.streamed,
    streamedChunks: Number(r.streamed_chunks)||0,
    streamedBytes: Number(r.streamed_bytes)||0,
    avgChunkMs: Number(r.avg_chunk_ms)||0,
    avgChunkBytes: Number(r.avg_chunk_bytes)||0,
    attempt: Number(r.attempt)||0,
    createdAt: new Date(r.created_at).getTime()
  }));
  return new Response(JSON.stringify({ data: dto, error: null }), { status: 200, headers: { 'Content-Type': 'application/json','X-Export-Queue-Mode':'persistent' } });
}

export const GET = withLogging(_GET as any, 'GET /api/exports/jobs/perf'); // eslint-disable-line @typescript-eslint/no-explicit-any