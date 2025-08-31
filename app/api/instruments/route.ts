import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { listInstruments, createInstrument } from '@/lib/services/instrument-service';
import { validationError, unauthorized, internal, forbidden, conflict } from '@/lib/errors';
import { instrumentCreateSchema } from '@/lib/validation/trade';

export async function GET() {
  const instruments = await listInstruments('ignored');
  return new Response(JSON.stringify({ data: instruments, error: null }), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN') return new Response(JSON.stringify({ data: null, error: forbidden('Admin only') }), { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = instrumentCreateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ data: null, error: validationError(parsed.error) }), { status: 400 });
  try {
    const inst = await createInstrument(userId, parsed.data);
    return new Response(JSON.stringify({ data: inst, error: null }), { status: 201 });
  } catch (e: any) {
    console.error(e);
    if (e.code === 'CONFLICT') {
      return new Response(JSON.stringify({ data: null, error: conflict('Instrument already exists') }), { status: 409 });
    }
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
