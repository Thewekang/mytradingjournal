import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { tradeCreateSchema } from '@/lib/validation/trade';
import { createTrade, listTrades, computePerTradeRiskPct, RiskError } from '@/lib/services/trade-service';
import { hasActiveHardBreach } from '@/lib/services/risk-service';
import { validationError, unauthorized, internal } from '@/lib/errors';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  const { searchParams } = new URL(req.url);
  const directionRaw = searchParams.get('direction');
  const statusRaw = searchParams.get('status');
  const filters = {
    instrumentId: searchParams.get('instrumentId') || undefined,
    direction: directionRaw && ['LONG','SHORT'].includes(directionRaw) ? (directionRaw as any) : undefined,
    status: statusRaw && ['OPEN','CLOSED','CANCELLED'].includes(statusRaw) ? (statusRaw as any) : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    q: searchParams.get('q') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    tagIds: searchParams.getAll('tagId')
  };
  const result = await listTrades(userId, filters);
  return new Response(JSON.stringify({ data: result, error: null }), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parse = tradeCreateSchema.safeParse(json);
  if (!parse.success) {
    return new Response(JSON.stringify({ data: null, error: validationError(parse.error) }), { status: 400 });
  }
  try {
    // Risk guard: block if hard breach today
    const blocked = await hasActiveHardBreach(userId);
    if (blocked) {
      return new Response(JSON.stringify({ data: null, error: { code: 'RISK_BLOCK', message: 'Daily risk limit breached. New trades blocked for today.' } }), { status: 403 });
    }
    let trade;
    try {
      trade = await createTrade(userId, parse.data);
    } catch (err: any) {
      if (err instanceof RiskError) {
        return new Response(JSON.stringify({ data: null, error: { code: 'RISK_PER_TRADE_BLOCK', message: err.message, value: err.riskPct, limit: err.limit } }), { status: 403 });
      }
      throw err;
    }
  // Non-blocking per-trade risk warning
  const riskEval = await computePerTradeRiskPct(userId, { entryPrice: trade.entryPrice, quantity: trade.quantity, instrumentId: trade.instrumentId });
  const riskWarning = riskEval && riskEval.riskPct > riskEval.limit ? { code: 'RISK_PER_TRADE', message: `Trade risk ~${riskEval.riskPct.toFixed(2)}% exceeds limit ${riskEval.limit}%` } : null;
  return new Response(JSON.stringify({ data: trade, warning: riskWarning, error: null }), { status: 201 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}
