import { getSessionUser } from '@/lib/session';
import { listTrades } from '@/lib/services/trade-service';
import { rowsToCsv } from '@/lib/export/csv';
// Dynamic import for XLSX to keep base bundle smaller
interface ExportRow { [k: string]: string | number | '' }
async function generateXlsx(rows: ExportRow[], headers: string[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out as ArrayBuffer);
}


export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const dRaw = searchParams.get('direction');
  const sRaw = searchParams.get('status');
  const filters = {
    instrumentId: searchParams.get('instrumentId') || undefined,
    direction: dRaw && (dRaw === 'LONG' || dRaw === 'SHORT') ? dRaw as 'LONG' | 'SHORT' : undefined,
  status: sRaw && (sRaw === 'OPEN' || sRaw === 'CLOSED' || sRaw === 'CANCELLED') ? (sRaw as 'OPEN' | 'CLOSED' | 'CANCELLED') : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    q: searchParams.get('q') || undefined,
    limit: 5000 // large cap for export
  };
  const { items } = await listTrades(user.id, filters);
  const defaultCols = ['id','instrumentId','direction','entryPrice','exitPrice','quantity','status','entryAt','exitAt','realizedPnl','tags'];
  const colsParam = searchParams.getAll('col');
  const cols = colsParam.length ? colsParam.filter(c => defaultCols.includes(c)) : defaultCols;
  const format = (searchParams.get('format') || 'csv').toLowerCase(); // csv | json | xlsx
  const rows: ExportRow[] = items.map(t => {
    const realized = (t as unknown as { realizedPnl?: number | null }).realizedPnl ?? '';
    const tagRels = (t as unknown as { tags?: { tag: { label: string } }[] }).tags;
    const tagsStr = tagRels?.map(rel => rel.tag.label).join('|') || '';
    const base: ExportRow = {
      id: t.id,
      instrumentId: t.instrumentId,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice ?? '',
      quantity: t.quantity,
      status: t.status,
      entryAt: t.entryAt.toISOString(),
      exitAt: t.exitAt ? t.exitAt.toISOString() : '',
      realizedPnl: realized === '' ? '' : realized,
      tags: tagsStr
    };
    return cols.reduce<ExportRow>((acc, c) => { acc[c] = base[c]; return acc; }, {} as ExportRow);
  });
  if (format === 'json') {
    return new Response(JSON.stringify({ columns: cols, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (format === 'xlsx') {
    const bin = await generateXlsx(rows, cols);
    return new Response(bin, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="trades-export.xlsx"' } });
  }
  // default CSV
  const csv = rowsToCsv(cols, rows as unknown as Record<string, unknown>[]);
  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="trades-export.csv"' } });
}