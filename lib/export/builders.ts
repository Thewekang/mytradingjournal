// Shared export building logic for both in-memory and persistent export workers.
// Supports CSV, JSON, and XLSX generation for the defined export job types.

import { prisma } from '@/lib/prisma';
import { listTrades, computeRealizedPnl } from '@/lib/services/trade-service';
import { csvEscape } from '@/lib/export/csv';
import * as XLSX from 'xlsx';

export type ExportBuilderType = 'trades' | 'goals' | 'dailyPnl' | 'tagPerformance';

export interface BuildCsvParamsMap {
  trades: { limit?: number; dateFrom?: string; dateTo?: string; tagIds?: string[]; instrumentId?: string; status?: string; direction?: string; selectedColumns?: string[] };
  goals: Record<string, never>;
  dailyPnl: Record<string, never>;
  tagPerformance: Record<string, never>;
}

interface BuiltTable {
  headers: string[];
  rows: Array<Record<string, unknown>>; // normalized row objects with header keys
  filenameBase: string; // without extension
}

async function buildTable<T extends ExportBuilderType>(userId: string, type: T, params: BuildCsvParamsMap[T] | undefined): Promise<BuiltTable> {
  if (type === 'trades') {
    const p = (params as BuildCsvParamsMap['trades']) || {};
    const limit = p.limit ?? 5000;
    const { items } = await listTrades(userId, {
      limit,
      dateFrom: p.dateFrom,
      dateTo: p.dateTo,
      tagIds: p.tagIds,
      instrumentId: p.instrumentId,
      status: p.status as unknown as 'OPEN' | 'CLOSED' | 'CANCELLED' | undefined,
      direction: p.direction as unknown as 'LONG' | 'SHORT' | undefined
    });
    const defaultHeaders = ['id', 'instrumentId', 'direction', 'entryPrice', 'exitPrice', 'quantity', 'status', 'entryAt', 'exitAt'];
    const headers = Array.isArray(p.selectedColumns) && p.selectedColumns.length > 0
      ? defaultHeaders.filter(h => p.selectedColumns!.includes(h))
      : defaultHeaders;
    const rows = items.map(t => {
      const r: Record<string, unknown> = {};
      for (const h of headers) {
        const val = (t as unknown as Record<string, unknown>)[h];
        r[h] = val instanceof Date ? val.toISOString() : (val ?? '');
      }
      return r;
    });
    return { headers, rows, filenameBase: 'trades-export' };
  }
  if (type === 'goals') {
    const goals = await prisma.goal.findMany({ where: { userId } });
    const headers = ['id', 'type', 'period', 'targetValue', 'currentValue', 'startDate', 'endDate', 'achievedAt', 'windowDays'];
    const rows = goals.map(g => ({
      id: g.id,
      type: g.type,
      period: g.period,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      startDate: g.startDate.toISOString(),
      endDate: g.endDate.toISOString(),
      achievedAt: g.achievedAt ? g.achievedAt.toISOString() : '',
      windowDays: g.windowDays
    }));
    return { headers, rows, filenameBase: 'goals-export' };
  }
  if (type === 'dailyPnl') {
    const trades = await prisma.trade.findMany({ where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } }, include: { instrument: { select: { contractMultiplier: true } } } });
    const daily: Record<string, number> = {};
    for (const t of trades) {
      if (!t.exitAt) continue;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier });
      if (pnl == null) continue;
      const key = t.exitAt.toISOString().slice(0, 10);
      daily[key] = (daily[key] || 0) + pnl;
    }
    const headers = ['date', 'pnl'];
    const rows = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).map(([d, p]) => ({ date: d, pnl: Number(p.toFixed(2)) }));
    return { headers, rows, filenameBase: 'daily-pnl' };
  }
  if (type === 'tagPerformance') {
    const links = await prisma.tradeTagOnTrade.findMany({ where: { trade: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } } }, include: { tag: true, trade: { include: { instrument: { select: { contractMultiplier: true } } } } } });
    const map: Record<string, { label: string; trades: number; wins: number; losses: number; sum: number }> = {};
    for (const l of links) {
      const t = l.trade;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: t.instrument?.contractMultiplier });
      if (pnl == null) continue;
      const bucket = map[l.tagId] || (map[l.tagId] = { label: l.tag.label, trades: 0, wins: 0, losses: 0, sum: 0 });
      bucket.trades++;
      if (pnl >= 0) bucket.wins++; else bucket.losses++;
      bucket.sum += pnl;
    }
    const headers = ['tagId', 'label', 'trades', 'wins', 'losses', 'winRate', 'sumPnl', 'avgPnl'];
    const rows = Object.entries(map).map(([tagId, b]) => ({
      tagId,
      label: b.label,
      trades: b.trades,
      wins: b.wins,
      losses: b.losses,
      winRate: b.trades ? Number((b.wins / b.trades).toFixed(4)) : 0,
      sumPnl: Number(b.sum.toFixed(2)),
      avgPnl: b.trades ? Number((b.sum / b.trades).toFixed(2)) : 0
    }));
    return { headers, rows, filenameBase: 'tag-performance' };
  }
  throw new Error('Unsupported export type');
}

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export async function buildExport<T extends ExportBuilderType>(userId: string, type: T, format: ExportFormat, params: BuildCsvParamsMap[T] | undefined) {
  const table = await buildTable(userId, type, params);
  if (format === 'csv') {
    const lines = [table.headers.join(',')];
    for (const r of table.rows) {
      lines.push(table.headers.map(h => csvEscape(r[h])).join(','));
    }
    return { contentType: 'text/csv', filename: `${table.filenameBase}.csv`, data: lines.join('\n') };
  }
  if (format === 'json') {
    return { contentType: 'application/json', filename: `${table.filenameBase}.json`, data: JSON.stringify(table.rows) };
  }
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const aoa = [table.headers, ...table.rows.map(r => table.headers.map(h => r[h]))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `${table.filenameBase}.xlsx`, data: buf }; // binary buffer
  }
  throw new Error('Unsupported format');
}
