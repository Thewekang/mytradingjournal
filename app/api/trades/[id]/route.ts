import { NextRequest } from 'next/server';
import { withLogging, jsonOk, jsonError } from '@/lib/api/logger-wrapper';
import { RouteContext } from '@/lib/api/params';
import { getSessionUser } from '@/lib/session';
import { updateTrade, deleteTrade, computeRealizedPnl } from '@/lib/services/trade-service';
import { tradeUpdateSchema } from '@/lib/validation/trade';
import { validationError, unauthorized, internal, notFound, isApiErrorShape, httpStatusForError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

async function _GET(_: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const trade = await prisma.trade.findFirst({ where: { id: params.id, userId: user.id, deletedAt: null }, include: { tags: { include: { tag: true } }, instrument: { select: { contractMultiplier: true } } } });
  if (!trade) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
  const realizedPnl = computeRealizedPnl({ entryPrice: trade.entryPrice, exitPrice: trade.exitPrice ?? undefined, quantity: trade.quantity, direction: trade.direction, fees: trade.fees, contractMultiplier: trade.instrument?.contractMultiplier ?? undefined });
  return jsonOk({ ...trade, realizedPnl });
}

async function _PATCH(req: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = tradeUpdateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ data: null, error: validationError(parsed.error) }), { status: 400 });
  try {
  const updated = await updateTrade(user.id, params.id, parsed.data);
    if (!updated) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
  return jsonOk(updated);
  } catch (e) {
  if (isApiErrorShape(e)) return jsonError(e, httpStatusForError(e));
  return jsonError(internal(), 500);
  }
}

async function _DELETE(_: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
  const ok = await deleteTrade(user.id, params.id);
    if (!ok) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
  return new Response(JSON.stringify({ data: true, error: null }), { status: 204, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
  if (isApiErrorShape(e)) return jsonError(e, httpStatusForError(e));
  return jsonError(internal(), 500);
  }
}

export const GET = withLogging(_GET as any, 'GET /api/trades/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
export const PATCH = withLogging(_PATCH as any, 'PATCH /api/trades/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
export const DELETE = withLogging(_DELETE as any, 'DELETE /api/trades/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
