import { NextRequest } from 'next/server';
import { withLogging, jsonError, jsonOk } from '@/lib/api/logger-wrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { tradeCreateSchema } from '@/lib/validation/trade';
import { createTrade, listTrades, computePerTradeRiskPct, RiskError } from '@/lib/services/trade-service';
import { hasActiveHardBreach } from '@/lib/services/risk-service';
import { validationError, unauthorized, internal, isApiErrorShape, httpStatusForError } from '@/lib/errors';
import { ResponseEnvelope, TradeDTO } from '@/types/api';

async function _GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = typeof session?.user === 'object' && session.user && 'id' in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const { searchParams } = new URL(req.url);
  const directionRaw = searchParams.get('direction');
  const statusRaw = searchParams.get('status');
  const filters = {
    instrumentId: searchParams.get('instrumentId') || undefined,
  direction: directionRaw && ['LONG','SHORT'].includes(directionRaw) ? (directionRaw as 'LONG' | 'SHORT') : undefined,
  status: statusRaw && ['OPEN','CLOSED','CANCELLED'].includes(statusRaw) ? (statusRaw as 'OPEN' | 'CLOSED' | 'CANCELLED') : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    q: searchParams.get('q') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    tagIds: searchParams.getAll('tagId')
  };
  const result = await listTrades(userId, filters);
  const dto = result.items.map(t => ({
    id: t.id,
    instrumentId: t.instrumentId,
    direction: t.direction,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    quantity: t.quantity,
    status: t.status,
    entryAt: t.entryAt.toISOString(),
    exitAt: t.exitAt ? t.exitAt.toISOString() : null,
    realizedPnl: t.realizedPnl ?? null,
    tags: t.tags.map(tt => ({ id: tt.tag.id, label: tt.tag.label, color: tt.tag.color }))
  } satisfies TradeDTO));
  const payload: ResponseEnvelope<{ items: TradeDTO[]; nextCursor: string | null }> = { data: { items: dto, nextCursor: result.nextCursor }, error: null };
  return jsonOk(payload.data);
}

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = typeof session?.user === 'object' && session.user && 'id' in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) {
  return jsonError(unauthorized(), 401);
  }
  const json = await req.json().catch(() => null);
  const parse = tradeCreateSchema.safeParse(json);
  if (!parse.success) {
  return jsonError(validationError(parse.error), 400);
  }
  try {
    // Risk guard: block if hard breach today
    const blocked = await hasActiveHardBreach(userId);
    if (blocked) {
  return jsonError({ code: 'RISK_BLOCK', message: 'Daily risk limit breached. New trades blocked for today.' }, 403);
    }
    let trade;
    try {
      trade = await createTrade(userId, parse.data);
    } catch (err) {
      if (err instanceof RiskError) {
  return jsonError({ code: 'RISK_PER_TRADE_BLOCK', message: err.message, details: { value: err.riskPct, limit: err.limit } }, 403);
      }
      throw err;
    }
  // Non-blocking per-trade risk warning
  const riskEval = await computePerTradeRiskPct(userId, { entryPrice: trade.entryPrice, quantity: trade.quantity, instrumentId: trade.instrumentId });
  const riskWarning = riskEval && riskEval.riskPct > riskEval.limit ? { code: 'RISK_PER_TRADE', message: `Trade risk ~${riskEval.riskPct.toFixed(2)}% exceeds limit ${riskEval.limit}%` } : null;
  const dto: TradeDTO = {
    id: trade.id,
    instrumentId: trade.instrumentId,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    quantity: trade.quantity,
    status: trade.status,
    entryAt: trade.entryAt.toISOString(),
    exitAt: trade.exitAt ? trade.exitAt.toISOString() : null,
    realizedPnl: trade.realizedPnl ?? null,
    tags: trade.tags?.map(t => ({ id: t.tagId, label: '', color: '' })) // placeholder; expand if tags loaded on create
  };
  return new Response(JSON.stringify({ data: dto, warning: riskWarning, error: null }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    if (isApiErrorShape(e)) return jsonError(e, httpStatusForError(e));
    return jsonError(internal(), 500);
  }
}

export const GET = withLogging(_GET, 'GET /api/trades');
export const POST = withLogging(_POST, 'POST /api/trades');
