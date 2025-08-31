import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSettings, updateSettings } from '@/lib/services/settings-service';
import { settingsUpdateSchema } from '@/lib/validation/trade';
import { validationError, unauthorized, internal } from '@/lib/errors';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const s = await getSettings(userId);
  return new Response(JSON.stringify({ data: s, error: null }), { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ data: null, error: validationError(parsed.error) }), { status: 400 });
  try {
    const updated = await updateSettings(userId, parsed.data);
    return new Response(JSON.stringify({ data: updated, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
