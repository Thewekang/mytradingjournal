import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { listTags, createTag } from '@/lib/services/tag-service';
import { validationError, unauthorized, internal } from '@/lib/errors';
import { tagCreateSchema } from '@/lib/validation/trade';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const tags = await listTags(userId);
  return new Response(JSON.stringify({ data: tags, error: null }), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = tagCreateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ data: null, error: validationError(parsed.error) }), { status: 400 });
  try {
    const tag = await createTag(userId, parsed.data);
    return new Response(JSON.stringify({ data: tag, error: null }), { status: 201 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
