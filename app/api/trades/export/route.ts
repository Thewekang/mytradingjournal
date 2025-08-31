import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { listTrades } from '@/lib/services/trade-service';
import { csvEscape, rowsToCsv } from '@/lib/export/csv';
// Dynamic import for XLSX to keep base bundle smaller
async function generateXlsx(rows: any[], headers: string[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out as any);
}


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const dRaw = searchParams.get('direction');
  const sRaw = searchParams.get('status');
  const filters = {
    instrumentId: searchParams.get('instrumentId') || undefined,
    direction: dRaw && (dRaw === 'LONG' || dRaw === 'SHORT') ? dRaw as 'LONG' | 'SHORT' : undefined,
    status: sRaw && (sRaw === 'OPEN' || sRaw === 'CLOSED' || sRaw === 'CANCELLED') ? sRaw as any : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    q: searchParams.get('q') || undefined,
    limit: 5000 // large cap for export
  };
  const { items } = await listTrades(userId, filters);
  const defaultCols = ['id','instrumentId','direction','entryPrice','exitPrice','quantity','status','entryAt','exitAt','realizedPnl','tags'];
  const colsParam = searchParams.getAll('col');
  const cols = colsParam.length ? colsParam.filter(c => defaultCols.includes(c)) : defaultCols;
  const format = (searchParams.get('format') || 'csv').toLowerCase(); // csv | json | xlsx
  const rows = items.map(t => {
    const realized = (t as any).realizedPnl ?? '';
    const tagsStr = (t as any).tags?.map((tt:any)=>tt.tag.label).join('|') || '';
    const base: Record<string, any> = {
      id: t.id,
      instrumentId: t.instrumentId,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice ?? '',
      quantity: t.quantity,
      status: t.status,
      entryAt: t.entryAt.toISOString(),
      exitAt: t.exitAt ? t.exitAt.toISOString() : '',
      realizedPnl: realized,
      tags: tagsStr
    };
    return cols.reduce((acc: Record<string, any>, c) => { acc[c] = base[c]; return acc; }, {});
  });
  if (format === 'json') {
    return new Response(JSON.stringify({ columns: cols, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (format === 'xlsx') {
    const bin = await generateXlsx(rows, cols);
    return new Response(bin, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="trades-export.xlsx"' } });
  }
  // default CSV
  const csv = rowsToCsv(cols, rows as any);
  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="trades-export.csv"' } });
}