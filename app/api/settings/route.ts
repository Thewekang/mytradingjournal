import { NextRequest } from 'next/server';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isSessionUser } from '@/lib/session';
import { getSettings, updateSettings } from '@/lib/services/settings-service';
import { settingsUpdateSchema } from '@/lib/validation/trade';
import { validationError, unauthorized, internal } from '@/lib/errors';

async function _GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const userId = isSessionUser(user) ? user.id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const s = await getSettings(userId);
  return jsonOk(s);
}

async function _PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const userId = isSessionUser(user) ? user.id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(validationError(parsed.error), 400);
  try {
    const updated = await updateSettings(userId, parsed.data);
    return jsonOk(updated);
  } catch {
    return jsonError(internal(), 500);
  }
}

export const GET = withLogging(_GET, 'GET /api/settings');
export const PATCH = withLogging(_PATCH, 'PATCH /api/settings');
