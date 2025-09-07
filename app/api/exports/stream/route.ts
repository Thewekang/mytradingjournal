import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { withLogging } from '@/lib/api/logger-wrapper';
import { buildTable } from '@/lib/export/builders';
import { csvEscape } from '@/lib/export/csv';
import { getExportStreamingChunkSize, getExportStreamingRowThreshold } from '@/lib/constants';

// Direct streaming endpoint (bypasses queued job) for CSV only.
// Query params: type=trades|goals|dailyPnl|tagPerformance, format=csv (default), forceStream=1 to always stream
// Optional trades-specific params: limit, dateFrom, dateTo, instrumentId, status, direction, selectedColumns (comma list)
async function _GET(req: Request) {
  const session = await getServerSession(authOptions); const user = session?.user as { id?: string } | undefined; const userId = user?.id; if(!userId) return new Response('Unauthorized',{status:401});
  const url = new URL(req.url);
  const type = (url.searchParams.get('type')||'trades') as 'trades'|'goals'|'dailyPnl'|'tagPerformance';
  const format = (url.searchParams.get('format')||'csv');
  if(format !== 'csv') return new Response('Only CSV supported',{status:400});
  const forceStream = url.searchParams.get('forceStream') === '1';
  const params: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  if(type==='trades'){
    if(url.searchParams.get('limit')) params.limit = Number(url.searchParams.get('limit'))||undefined;
    for(const f of ['dateFrom','dateTo','instrumentId','status','direction']){ const v = url.searchParams.get(f); if(v) params[f]=v; }
    const selectedColumns = url.searchParams.get('selectedColumns');
    if(selectedColumns) params.selectedColumns = selectedColumns.split(',').map(s=>s.trim()).filter(Boolean);
  }
  const table = await buildTable(userId, type, params);
  const shouldStream = forceStream || table.rows.length > getExportStreamingRowThreshold();
  if(!shouldStream){
    const lines = [table.headers.join(',')];
    for(const r of table.rows) lines.push(table.headers.map(h => csvEscape(r[h])).join(','));
    return new Response(lines.join('\n'), { status:200, headers:{'Content-Type':'text/csv','Content-Disposition':`attachment; filename="${table.filenameBase}.csv"`} });
  }
  async function *gen(){
    yield table.headers.join(',') + '\n';
    let buffer: string[] = [];
    let count = 0;
    for(const r of table.rows){
      buffer.push(table.headers.map(h => csvEscape(r[h])).join(','));
      count++;
  if(buffer.length >= getExportStreamingChunkSize()){
        yield buffer.join('\n') + '\n';
        buffer = [];
      }
    }
    if(buffer.length) yield buffer.join('\n') + '\n';
    yield `# streamed_rows=${count}\n`;
  }
  const stream = new ReadableStream({
    async start(controller){
      try {
        for await (const chunk of gen()) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      } catch(err){
        controller.error(err);
      }
    }
  });
  return new Response(stream, { status:200, headers:{'Content-Type':'text/csv','Content-Disposition':`attachment; filename="${table.filenameBase}.csv"`} });
}

export const GET = withLogging(_GET as any, 'GET /api/exports/stream'); // eslint-disable-line @typescript-eslint/no-explicit-any
