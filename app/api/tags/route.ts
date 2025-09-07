import { NextRequest } from 'next/server';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isSessionUser } from '@/lib/session';
import { listTags, createTag } from '@/lib/services/tag-service';
import { validationError, unauthorized, internal, isApiErrorShape, httpStatusForError } from '@/lib/errors';
import { tagCreateSchema } from '@/lib/validation/trade';

async function _GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const userId = isSessionUser(user) ? user.id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const tags = await listTags(userId);
  return jsonOk(tags);
}

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const userId = isSessionUser(user) ? user.id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = tagCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(validationError(parsed.error), 400);
  try {
    const tag = await createTag(userId, parsed.data);
    return jsonOk(tag, 201);
  } catch (e) {
    if (isApiErrorShape(e)) return jsonError(e, httpStatusForError(e));
    return jsonError(internal(), 500);
  }
}

export const GET = withLogging(_GET, 'GET /api/tags');
export const POST = withLogging(_POST, 'POST /api/tags');
