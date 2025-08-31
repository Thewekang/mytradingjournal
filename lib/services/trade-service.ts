import { TradeCreateInput, TradeUpdateInput, tradeDirectionEnum, tradeStatusEnum } from '../validation/trade';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { invalidateAnalyticsCache } from '@/lib/analytics-cache';
import { recalcGoalsForTradeMutation } from './goal-service';
import { scheduleRiskEvaluation } from './risk-service';
import { prisma } from '@/lib/prisma';

// Core DTOs exposed by service (strip instrument + internal fields not needed externally)
export interface TradeCore {
  id: string;
  userId: string;
  instrumentId: string;
  direction: Dir;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  leverage: number | null;
  entryAt: Date;
  exitAt: Date | null;
  fees: number;
  notes: string | null;
  reason: string | null;
  lesson: string | null;
  status: Stat;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export type TradeWithTags = TradeCore & { tags: { tagId: string }[] };

export interface CreatedTradeResult extends TradeCore {
  realizedPnl?: number | null; // computed only if exit present
  tags?: { tagId: string }[];
}

export function computeRealizedPnl(t: { entryPrice: number; exitPrice?: number | null; quantity: number; direction: string; fees?: number; contractMultiplier?: number | null }): number | null {
  if (t.exitPrice == null) return null;
  const sign = t.direction === 'LONG' ? 1 : -1;
  const multiplier = t.contractMultiplier ?? 1;
  const gross = (t.exitPrice - t.entryPrice) * sign * t.quantity * multiplier;
  const fees = t.fees ?? 0;
  return +(gross - fees).toFixed(2);
}

export async function createTrade(userId: string, input: TradeCreateInput): Promise<CreatedTradeResult> {
  // Enforce per-trade risk before creating (fetch settings + instrument)
  const settings = await prisma.journalSettings.findUnique({ where: { userId } });
  if (settings) {
    const instrument = await prisma.instrument.findUnique({ where: { id: input.instrumentId }, select: { contractMultiplier: true, symbol: true } });
    const riskEval = await computePerTradeRiskPctInternal(settings, instrument?.contractMultiplier ?? 1, input.entryPrice, input.quantity);
    if (riskEval.riskPct > settings.riskPerTradePct) {
      throw new RiskError(`Per-trade risk ${riskEval.riskPct.toFixed(2)}% exceeds limit ${settings.riskPerTradePct}%`, riskEval.riskPct, settings.riskPerTradePct);
    }
  }
  const result = await prisma.$transaction(async (tx: any) => {
    const trade = await tx.trade.create({
      data: {
        userId,
        instrumentId: input.instrumentId,
        direction: input.direction as Dir,
        entryPrice: input.entryPrice,
        quantity: input.quantity,
        leverage: input.leverage ?? null,
        entryAt: new Date(input.entryAt),
        fees: input.fees ?? 0,
        notes: input.notes,
        reason: input.reason,
      },
      include: { instrument: { select: { contractMultiplier: true } } }
    });
    if (input.tags?.length) {
      await tx.tradeTagOnTrade.createMany({
        data: input.tags.map(tagId => ({ tradeId: trade.id, tagId }))
      });
    }
    const realizedPnl = computeRealizedPnl({
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? undefined,
      quantity: trade.quantity,
      direction: trade.direction,
      fees: trade.fees,
      contractMultiplier: trade.instrument?.contractMultiplier
    });
    return {
      id: trade.id,
      userId: trade.userId,
      instrumentId: trade.instrumentId,
      direction: trade.direction as Dir,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? null,
      quantity: trade.quantity,
      leverage: trade.leverage ?? null,
      entryAt: trade.entryAt,
      exitAt: trade.exitAt ?? null,
      fees: trade.fees,
      notes: trade.notes ?? null,
      reason: trade.reason ?? null,
      lesson: trade.lesson ?? null,
      status: trade.status as Stat,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
      deletedAt: trade.deletedAt ?? null,
      realizedPnl
    };
  });
  invalidateAnalyticsCache(userId);
  recalcGoalsForTradeMutation(userId);
  scheduleRiskEvaluation(userId);
  return result;
}

// Preliminary per-trade risk evaluation (assuming stop distance later; currently uses entryPrice * quantity heuristic placeholder)
export async function computePerTradeRiskPct(userId: string, trade: { entryPrice: number; quantity: number; instrumentId: string }): Promise<{ riskPct: number; limit: number } | null> {
  const settings = await prisma.journalSettings.findUnique({ where: { userId } });
  if (!settings) return null;
  const instrument = await prisma.instrument.findUnique({ where: { id: trade.instrumentId }, select: { contractMultiplier: true } });
  const evalRes = computePerTradeRiskPctInternal(settings, instrument?.contractMultiplier ?? 1, trade.entryPrice, trade.quantity);
  return { riskPct: evalRes.riskPct, limit: settings.riskPerTradePct };
}

function computePerTradeRiskPctInternal(settings: { initialEquity: number; riskPerTradePct: number }, contractMultiplier: number, entryPrice: number, quantity: number) {
  const notional = entryPrice * quantity * (contractMultiplier || 1);
  const riskPct = (notional / (settings.initialEquity || 100000)) * 100;
  return { riskPct };
}

export class RiskError extends Error {
  constructor(message: string, public riskPct: number, public limit: number) {
    super(message);
    this.name = 'RiskError';
  }
}

export async function updateTrade(userId: string, id: string, input: TradeUpdateInput): Promise<CreatedTradeResult | null> {
  const result = await prisma.$transaction(async (tx: any) => {
    const existing = await tx.trade.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const data: Record<string, unknown> = {};
    if (input.exitPrice !== undefined) data.exitPrice = input.exitPrice;
    if (input.exitAt) data.exitAt = new Date(input.exitAt);
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.reason !== undefined) data.reason = input.reason;
    if (input.lesson !== undefined) data.lesson = input.lesson;
    if (input.status) data.status = input.status;
    const trade = await tx.trade.update({ where: { id }, data, include: { instrument: { select: { contractMultiplier: true } } } });
    if (input.tags) {
      await tx.tradeTagOnTrade.deleteMany({ where: { tradeId: id } });
      if (input.tags.length) {
        await tx.tradeTagOnTrade.createMany({ data: input.tags.map(tagId => ({ tradeId: id, tagId })) });
      }
    }
    const realizedPnl = computeRealizedPnl({
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? undefined,
      quantity: trade.quantity,
      direction: trade.direction,
      fees: trade.fees,
      contractMultiplier: trade.instrument?.contractMultiplier
    });
    return {
      id: trade.id,
      userId: trade.userId,
      instrumentId: trade.instrumentId,
      direction: trade.direction as Dir,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? null,
      quantity: trade.quantity,
      leverage: trade.leverage ?? null,
      entryAt: trade.entryAt,
      exitAt: trade.exitAt ?? null,
      fees: trade.fees,
      notes: trade.notes ?? null,
      reason: trade.reason ?? null,
      lesson: trade.lesson ?? null,
      status: trade.status as Stat,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
      deletedAt: trade.deletedAt ?? null,
      realizedPnl
    };
  });
  if (result) invalidateAnalyticsCache(userId);
  if (result) recalcGoalsForTradeMutation(userId);
  if (result) scheduleRiskEvaluation(userId);
  return result;
}

type Dir = z.infer<typeof tradeDirectionEnum>;
type Stat = z.infer<typeof tradeStatusEnum>;

export interface TradeListFilters {
  instrumentId?: string;
  direction?: Dir;
  status?: Stat;
  dateFrom?: string;
  dateTo?: string;
  tagIds?: string[];
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface ListTradesResultItem extends TradeCore {
  tags: { tag: { id: string; label: string; color: string } }[];
  realizedPnl?: number | null;
}
export interface ListTradesResult { items: ListTradesResultItem[]; nextCursor: string | null }

export async function listTrades(userId: string, filters: TradeListFilters): Promise<ListTradesResult> {
  const take = Math.min(filters.limit ?? 25, 100);
  // Prisma does not export model-specific WhereInput types in the generated bundle here; use a shaped object.
  const where: {
    userId: string;
    deletedAt: null;
    instrumentId?: string;
    direction?: Dir;
    status?: Stat;
    entryAt?: { gte?: Date; lte?: Date };
    tags?: { some: { tagId: { in: string[] } } };
    OR?: { notes?: any; reason?: any; lesson?: any }[];
  } = { userId, deletedAt: null };
  if (filters.instrumentId) where.instrumentId = filters.instrumentId;
  if (filters.direction) where.direction = filters.direction as Dir;
  if (filters.status) where.status = filters.status as Stat;
  if (filters.dateFrom || filters.dateTo) {
    where.entryAt = {};
    if (filters.dateFrom) where.entryAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.entryAt.lte = new Date(filters.dateTo);
  }
  if (filters.tagIds?.length) {
    where.tags = { some: { tagId: { in: filters.tagIds } } };
  }
  if (filters.q) {
    where.OR = [
      { notes: { contains: filters.q, mode: 'insensitive' } },
      { reason: { contains: filters.q, mode: 'insensitive' } },
      { lesson: { contains: filters.q, mode: 'insensitive' } }
    ];
  }
  const results = await prisma.trade.findMany({
    where,
    take: take + 1,
    orderBy: { entryAt: 'desc' },
    cursor: filters.cursor ? { id: filters.cursor } : undefined,
    include: { tags: { include: { tag: true } }, instrument: { select: { contractMultiplier: true } } }
  });
  const nextCursor = results.length > take ? results.pop()!.id : null;
  type TradeWithInc = typeof results[number];
  const items: ListTradesResultItem[] = results.map((r: TradeWithInc) => ({
    id: r.id,
    userId: r.userId,
    instrumentId: r.instrumentId,
    direction: r.direction as Dir,
    entryPrice: r.entryPrice,
    exitPrice: r.exitPrice ?? null,
    quantity: r.quantity,
    leverage: r.leverage ?? null,
    entryAt: r.entryAt,
    exitAt: r.exitAt ?? null,
    fees: r.fees,
    notes: r.notes ?? null,
    reason: r.reason ?? null,
    lesson: r.lesson ?? null,
    status: r.status as Stat,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt ?? null,
  tags: r.tags.map((t: TradeWithInc['tags'][number]) => ({ tag: { id: t.tag.id, label: t.tag.label, color: t.tag.color } })),
    realizedPnl: computeRealizedPnl({
      entryPrice: r.entryPrice,
      exitPrice: r.exitPrice ?? undefined,
      quantity: r.quantity,
      direction: r.direction,
      fees: r.fees,
      contractMultiplier: r.instrument?.contractMultiplier
    })
  }));
  return { items, nextCursor };
}

export async function deleteTrade(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.trade.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return false;
  await prisma.trade.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
  invalidateAnalyticsCache(userId);
  recalcGoalsForTradeMutation(userId);
  scheduleRiskEvaluation(userId);
  return true;
}

export async function restoreTrade(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.trade.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!existing) return false;
  const newStatus = existing.status === 'CANCELLED' && !existing.exitAt ? 'OPEN' : existing.status;
  await prisma.trade.update({ where: { id }, data: { deletedAt: null, status: newStatus } });
  invalidateAnalyticsCache(userId);
  recalcGoalsForTradeMutation(userId);
  scheduleRiskEvaluation(userId);
  return true;
}

export async function purgeDeletedTrades(olderThan: Date) {
  const res = await prisma.trade.deleteMany({ where: { deletedAt: { lt: olderThan } } });
  return res.count;
}
