import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { RouteContext } from '@/lib/api/params';
import { unauthorized, forbidden, notFound, internal } from '@/lib/errors';

export async function POST(_req: Request, { params }: RouteContext<{ id: string }>) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN') return new Response(JSON.stringify({ data: null, error: forbidden('Admin only') }), { status: 403 });
  try {
    const existing = await prisma.instrument.findUnique({ where: { id: params.id } });
    if (!existing) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
    const updated = await prisma.instrument.update({ where: { id: params.id }, data: { isActive: false } });
    return new Response(JSON.stringify({ data: updated, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
