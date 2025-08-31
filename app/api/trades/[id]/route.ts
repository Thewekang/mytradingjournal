import { NextRequest } from 'next/server';
import { RouteContext } from '@/lib/api/params';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { updateTrade, deleteTrade, computeRealizedPnl } from '@/lib/services/trade-service';
import { tradeUpdateSchema } from '@/lib/validation/trade';
import { validationError, unauthorized, internal, notFound } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: RouteContext<{ id: string }>) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const trade = await prisma.trade.findFirst({ where: { id: params.id, userId, deletedAt: null }, include: { tags: { include: { tag: true } }, instrument: { select: { contractMultiplier: true } } } });
  if (!trade) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
  const realizedPnl = computeRealizedPnl({ entryPrice: trade.entryPrice, exitPrice: trade.exitPrice ?? undefined, quantity: trade.quantity, direction: trade.direction, fees: trade.fees, contractMultiplier: (trade as any).instrument?.contractMultiplier });
  return new Response(JSON.stringify({ data: { ...trade, realizedPnl }, error: null }), { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: RouteContext<{ id: string }>) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = tradeUpdateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ data: null, error: validationError(parsed.error) }), { status: 400 });
  try {
    const updated = await updateTrade(userId, params.id, parsed.data);
    if (!updated) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
    return new Response(JSON.stringify({ data: updated, error: null }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteContext<{ id: string }>) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  try {
    const ok = await deleteTrade(userId, params.id);
    if (!ok) return new Response(JSON.stringify({ data: null, error: notFound() }), { status: 404 });
    return new Response(JSON.stringify({ data: true, error: null }), { status: 204 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
