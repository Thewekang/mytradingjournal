import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { RouteContext } from '@/lib/api/params';
import { unauthorized, forbidden, notFound, internal } from '@/lib/errors';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';

async function _POST(_req: Request, { params }: RouteContext<{ id: string }>) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!isSessionUser(user)) return jsonError(unauthorized(), 401);
  if (user.role !== 'ADMIN') return jsonError(forbidden('Admin only'), 403);
  try {
    const existing = await prisma.instrument.findUnique({ where: { id: params.id } });
    if (!existing) return jsonError(notFound(), 404);
    const updated = await prisma.instrument.update({ where: { id: params.id }, data: { isActive: false } });
    return jsonOk(updated);
  } catch {
    return jsonError(internal(), 500);
  }
}
export const POST = withLogging(_POST as any, 'POST /api/instruments/[id]/archive'); // eslint-disable-line @typescript-eslint/no-explicit-any
