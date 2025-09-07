// Shared export building logic for both in-memory and persistent export workers.
// Supports CSV, JSON, and XLSX generation for the defined export job types.

import { prisma } from '@/lib/prisma';
import { listTrades, computeRealizedPnl } from '@/lib/services/trade-service';
import { computeEvaluationProgress } from '@/lib/services/prop-evaluation-service';
import { csvEscape } from '@/lib/export/csv';
import { getExportStreamingRowThreshold, getExportStreamingChunkSize } from '@/lib/constants';
import * as XLSX from 'xlsx';
import { PNG } from 'pngjs';

export type ExportBuilderType = 'trades' | 'goals' | 'dailyPnl' | 'tagPerformance' | 'chartEquity' | 'propEvaluation';

export interface BuildCsvParamsMap {
  trades: { limit?: number; dateFrom?: string; dateTo?: string; tagIds?: string[]; instrumentId?: string; status?: string; direction?: string; selectedColumns?: string[] };
  goals: Record<string, never>;
  dailyPnl: Record<string, never>;
  tagPerformance: Record<string, never>;
  chartEquity: Record<string, never>; // placeholder params (future: range selection)
  propEvaluation: Record<string, never>;
}

interface BuiltTable {
  headers: string[];
  rows: Array<Record<string, unknown>>; // normalized row objects with header keys
  filenameBase: string; // without extension
}

// Exported for reuse by direct streaming endpoint (to avoid buffering large datasets twice)
export async function buildTable<T extends keyof BuildCsvParamsMap>(userId: string, type: T, params: BuildCsvParamsMap[T] | undefined): Promise<BuiltTable> {
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
  if (type === 'propEvaluation') {
    const progress = await computeEvaluationProgress(userId);
    const headers = ['active','phase','status','profitTarget','cumulativeProfit','progressPct','remainingTarget','remainingDailyLoss','remainingOverallLoss','daysTraded','minTradingDays','projectedDaysToTarget','alerts'];
    const rows = [progress ? {
      active: true,
      phase: progress.phase,
      status: progress.status,
      profitTarget: progress.profitTarget,
      cumulativeProfit: progress.cumulativeProfit,
      progressPct: progress.progressPct,
      remainingTarget: progress.remainingTarget,
      remainingDailyLoss: progress.remainingDailyLoss ?? '',
      remainingOverallLoss: progress.remainingOverallLoss ?? '',
      daysTraded: progress.daysTraded,
      minTradingDays: progress.minTradingDays,
      projectedDaysToTarget: progress.projectedDaysToTarget ?? '',
      alerts: progress.alerts.map(a => `${a.level}:${a.code}`).join('|')
    } : { active: false, phase: '', status: 'INACTIVE', profitTarget: '', cumulativeProfit: '', progressPct: '', remainingTarget: '', remainingDailyLoss: '', remainingOverallLoss: '', daysTraded: 0, minTradingDays: 0, projectedDaysToTarget: '', alerts: '' }];
    return { headers, rows, filenameBase: 'prop-evaluation' };
  }
  if (type === 'chartEquity') {
    // Minimal table describing chart data (metadata). Real PNG handled in buildExport when format=png.
    // Provide equity snapshot rows (date + equity) derived from trades for potential CSV/JSON fallback later.
    const trades = await prisma.trade.findMany({ where: { userId, status: 'CLOSED', deletedAt: null, exitAt: { not: null } }, orderBy: { exitAt: 'asc' } });
    let cumulative = 0;
    const headers = ['time','equity'];
    const rows = trades.map(t => {
      if (!t.exitAt) return null;
      const pnl = computeRealizedPnl({ entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? undefined, quantity: t.quantity, direction: t.direction, fees: t.fees, contractMultiplier: null });
      if (pnl != null) cumulative += pnl;
      return { time: t.exitAt.toISOString(), equity: Number(cumulative.toFixed(2)) };
    }).filter(Boolean) as Array<Record<string, unknown>>;
    return { headers, rows, filenameBase: 'equity-chart-data' };
  }
  throw new Error('Unsupported export type');
}

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'png';

export async function buildExport<T extends keyof BuildCsvParamsMap>(userId: string, type: T, format: ExportFormat, params: BuildCsvParamsMap[T] | undefined) {
  const table = await buildTable(userId, type, params);
  if (format === 'csv') {
    const forceStream = process.env.FORCE_STREAM_EXPORT === '1';
    // If row count exceeds threshold, return an async generator for streaming (or forced via env for tests)
    if (forceStream || table.rows.length > getExportStreamingRowThreshold()) {
      async function *gen() {
        yield table.headers.join(',') + '\n';
        let buffer: string[] = [];
        let count = 0;
        for (const r of table.rows) {
          buffer.push(table.headers.map(h => csvEscape(r[h])).join(','));
          count++;
          if (buffer.length >= getExportStreamingChunkSize()) {
            yield buffer.join('\n') + '\n';
            buffer = [];
          }
        }
  if (buffer.length) yield buffer.join('\n') + '\n';
  // Always append footer for deterministic tests when streaming (forced or threshold-triggered)
  yield `# streamed_rows=${count}\n`;
      }
      return { contentType: 'text/csv', filename: `${table.filenameBase}.csv`, data: gen() };
    } else {
      const lines = [table.headers.join(',')];
      for (const r of table.rows) {
        lines.push(table.headers.map(h => csvEscape(r[h])).join(','));
      }
      let csv = lines.join('\n');
      // Deterministic footer (row count) always appended for test stability & parity with streaming path
      if (table.rows.length > 0 && !csv.includes('# streamed_rows=')) {
        csv += `\n# streamed_rows=${table.rows.length}`;
      }
      if (!csv.endsWith('\n')) csv += '\n';
      return { contentType: 'text/csv', filename: `${table.filenameBase}.csv`, data: csv };
    }
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
  if (format === 'png') {
    // Only supported for chartEquity export type. We synthesize a lightweight placeholder PNG with simple text.
    if (type !== 'chartEquity') throw new Error('PNG export only supported for chartEquity');
    // Use the already-built equity table rows to render a simple line chart.
    const width = 960; const height = 480; const marginL = 48; const marginR = 16; const marginT = 12; const marginB = 28;
    const plotW = width - marginL - marginR; const plotH = height - marginT - marginB;
    const png = new PNG({ width, height });
    function setPixel(x: number, y: number, r: number, g: number, b: number, a = 255){
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const idx = (width * y + x) << 2;
      png.data[idx] = r; png.data[idx+1] = g; png.data[idx+2] = b; png.data[idx+3] = a;
    }
    // Background
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) setPixel(x,y,255,255,255,255);
  const rowsRaw = (await buildTable(userId, 'chartEquity', undefined)).rows;
  const rows = rowsRaw as Array<Record<string, unknown>>;
  if (!rows || rows.length === 0){
      // draw empty axes
      for(let x=marginL;x<marginL+plotW;x++) setPixel(x, height-marginB, 200,200,200,255);
      for(let y=marginT;y<marginT+plotH;y++) setPixel(marginL, y, 200,200,200,255);
      const buf = PNG.sync.write(png);
      return { contentType: 'image/png', filename: 'equity-chart.png', data: buf };
    }
  const equities = rows.map((r) => Number((r['equity'] as number) ?? 0));
    let min = Math.min(...equities); let max = Math.max(...equities);
    if (min === max){ min -= 1; max += 1; }
  const xStep = rows.length > 1 ? plotW / (rows.length - 1) : plotW;
    function toXY(i: number){
      const x = Math.round(marginL + i * xStep);
      const y = Math.round(marginT + (1 - ((equities[i] - min) / (max - min))) * plotH);
      return { x, y };
    }
    // Axes
    for(let x=marginL;x<=marginL+plotW;x++) setPixel(x, height-marginB, 200,200,200,255);
    for(let y=marginT;y<=marginT+plotH;y++) setPixel(marginL, y, 200,200,200,255);
    // Zero line if within range
    if (min < 0 && max > 0){
      const y0 = Math.round(marginT + (1 - ((0 - min)/(max-min))) * plotH);
      for(let x=marginL;x<=marginL+plotW;x++) setPixel(x, y0, 220,220,220,255);
    }
    // Polyline using Bresenham
    function drawLine(x0:number,y0:number,x1:number,y1:number,r:number,g:number,b:number){
      const dx = Math.abs(x1-x0), dy = -Math.abs(y1-y0); const sx = x0<x1?1:-1; const sy = y0<y1?1:-1; let err = dx+dy;
      let x=x0, y=y0; // draw with 2px thickness
      while(true){ setPixel(x,y,r,g,b,255); setPixel(x,y+1,r,g,b,255); if (x===x1 && y===y1) break; const e2=2*err; if(e2>=dy){ err+=dy; x+=sx; } if(e2<=dx){ err+=dx; y+=sy; } }
    }
    const color = { r: 52, g: 120, b: 246 }; // blue-ish accent
  for(let i=1;i<rows.length;i++){
      const p0 = toXY(i-1), p1 = toXY(i);
      drawLine(p0.x, p0.y, p1.x, p1.y, color.r, color.g, color.b);
    }
    const buf = PNG.sync.write(png);
    return { contentType: 'image/png', filename: 'equity-chart.png', data: buf };
  }
  throw new Error('Unsupported format');
}
