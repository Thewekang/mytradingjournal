import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { restoreTrade } from '@/lib/services/trade-service';
import { RouteContext } from '@/lib/api/params';
import { unauthorized, notFound, internal } from '@/lib/errors';

export async function POST(_: Request, { params }: RouteContext<{ id: string }>) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
    const ok = await restoreTrade(userId, params.id);
    if (!ok) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
    return new Response(JSON.stringify({ data: true, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
