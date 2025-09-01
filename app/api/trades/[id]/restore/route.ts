import { getSessionUser } from '@/lib/session';
import { restoreTrade } from '@/lib/services/trade-service';
import { RouteContext } from '@/lib/api/params';
import { unauthorized, notFound, internal } from '@/lib/errors';
import { withLogging, jsonOk, jsonError } from '@/lib/api/logger-wrapper';

async function _POST(_: Request, { params }: RouteContext<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
    const ok = await restoreTrade(user.id, params.id);
    if (!ok) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
  return jsonOk(true);
  } catch {
  return jsonError(internal(), 500);
  }
}
export const POST = withLogging(_POST as any, 'POST /api/trades/[id]/restore'); // eslint-disable-line @typescript-eslint/no-explicit-any
