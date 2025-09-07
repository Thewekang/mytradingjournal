import { NextRequest } from 'next/server';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { listInstruments, createInstrument } from '@/lib/services/instrument-service';
import { validationError, unauthorized, internal, forbidden, isApiErrorShape, httpStatusForError } from '@/lib/errors';
import { instrumentCreateSchema } from '@/lib/validation/trade';
import { InstrumentDTO } from '@/types/api';

async function _GET() {
  const instruments = await listInstruments();
  type InstrumentEntity = typeof instruments[number];
  const dto: InstrumentDTO[] = instruments.map((i: InstrumentEntity) => ({
    id: i.id,
    symbol: i.symbol,
    name: i.name,
    category: i.category,
    currency: i.currency,
    tickSize: i.tickSize,
    contractMultiplier: i.contractMultiplier ?? null,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));
  return jsonOk(dto);
}

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const userId = user?.id;
  if (!userId) return jsonError(unauthorized(), 401);
  if (user?.role !== 'ADMIN') return jsonError(forbidden('Admin only'), 403);
  const body: unknown = await req.json().catch(() => null);
  const parsed = instrumentCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(validationError(parsed.error), 400);
  try {
    const inst = await createInstrument(userId, parsed.data);
    const dto: InstrumentDTO = {
      id: inst.id,
      symbol: inst.symbol,
      name: inst.name,
      category: inst.category,
      currency: inst.currency,
      tickSize: inst.tickSize,
      contractMultiplier: inst.contractMultiplier ?? null,
      isActive: inst.isActive,
      createdAt: inst.createdAt.toISOString(),
      updatedAt: inst.updatedAt.toISOString(),
    };
  return jsonOk(dto, 201);
  } catch (e) {
    if (isApiErrorShape(e)) return jsonError(e, httpStatusForError(e));
    return jsonError(internal(), 500);
  }
}

export const GET = withLogging(_GET, 'GET /api/instruments');
export const POST = withLogging(_POST, 'POST /api/instruments');
