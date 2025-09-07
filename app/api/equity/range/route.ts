import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { equityRangeQuerySchema } from '@/lib/api/validation';
import { apiError } from '@/lib/api/errors';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const query = { from: url.searchParams.get('from') || undefined, to: url.searchParams.get('to') || undefined };
  const parsed = equityRangeQuerySchema.safeParse(query);
  if (!parsed.success) return apiError('BAD_REQUEST', parsed.error.issues[0]?.message || 'invalid query', 400);
  const { from, to } = parsed.data;
  const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId: session.user.id };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from + 'T00:00:00.000Z');
    if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
  }
  const rows = await prisma.dailyEquity.findMany({ where, orderBy: { date: 'asc' } });
  return Response.json({ data: rows });
}