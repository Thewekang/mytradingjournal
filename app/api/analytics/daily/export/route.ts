import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { rowsToCsvStream } from '@/lib/export/csv';

export async function GET(request: Request){
  const user = await getSessionUser();
  if(!user) return new Response('Unauthorized',{status:401});
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format')||'csv').toLowerCase();
  const daysParam = searchParams.get('days');
  const days = Math.min(365, Math.max(1, daysParam? parseInt(daysParam,10): 60));
  const since = new Date(Date.now()-days*86400000);
  const trades = await prisma.trade.findMany({ where:{ userId: user.id, status:'CLOSED', deletedAt:null, exitAt:{ not:null, gte: since } }, orderBy:{ exitAt:'asc' }, include:{ instrument:{ select:{ contractMultiplier:true } } }});
  const daily: Record<string, number> = {};
  for(const t of trades){
    if(!t.exitAt) continue;
  const pnl = computeRealizedPnl({ entryPrice:t.entryPrice, exitPrice:t.exitPrice??undefined, quantity:t.quantity, direction:t.direction, fees:t.fees, contractMultiplier:t.instrument?.contractMultiplier ?? undefined });
    if(pnl==null) continue;
    const key = t.exitAt.toISOString().slice(0,10);
    daily[key] = (daily[key]||0)+pnl;
  }
  const rows = Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,pnl])=>({ date, pnl:+pnl.toFixed(2) }));
  if(format==='json') return new Response(JSON.stringify({ columns:['date','pnl'], rows }),{status:200, headers:{'Content-Type':'application/json'}});
  if(format==='xlsx'){
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows,{header:['date','pnl']});
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Daily');
    const out = XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer;
  return new Response(new Uint8Array(out as ArrayBuffer),{status:200, headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="daily-pnl.xlsx"'}});
  }
  const stream = rowsToCsvStream(['date','pnl'], rows as unknown as Record<string, unknown>[]);
  return new Response(stream,{status:200, headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="daily-pnl.csv"'}});
}