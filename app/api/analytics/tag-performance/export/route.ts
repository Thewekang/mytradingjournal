import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { computeRealizedPnl } from '@/lib/services/trade-service';
import { rowsToCsvStream } from '@/lib/export/csv';

export async function GET(request: Request){
  const user = await getSessionUser();
  if(!user) return new Response('Unauthorized',{status:401});
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format')||'csv').toLowerCase();
  const links = await prisma.tradeTagOnTrade.findMany({ where:{ trade:{ userId: user.id, status:'CLOSED', deletedAt:null, exitAt:{ not:null } } }, include:{ tag:true, trade:{ include:{ instrument:{ select:{ contractMultiplier:true } } } } } });
  const map: Record<string, { label:string; color:string; trades:number; wins:number; losses:number; sumPnl:number; }> = {};
  for(const l of links){
  const t = l.trade; const pnl = computeRealizedPnl({ entryPrice:t.entryPrice, exitPrice:t.exitPrice??undefined, quantity:t.quantity, direction:t.direction, fees:t.fees, contractMultiplier:t.instrument?.contractMultiplier ?? undefined });
    if(pnl==null) continue;
    const bucket = map[l.tagId] || (map[l.tagId] = { label:l.tag.label, color:l.tag.color, trades:0, wins:0, losses:0, sumPnl:0 });
    bucket.trades++; if(pnl>=0) bucket.wins++; else bucket.losses++; bucket.sumPnl += pnl;
  }
  const rows = Object.entries(map).map(([tagId,r])=>({ tagId, label:r.label, trades:r.trades, wins:r.wins, losses:r.losses, winRate: r.trades? +(r.wins/r.trades).toFixed(4):0, sumPnl:+r.sumPnl.toFixed(2), avgPnl: r.trades? +(r.sumPnl/r.trades).toFixed(2):0 })).sort((a,b)=>Math.abs(b.sumPnl)-Math.abs(a.sumPnl));
  if(format==='json') return new Response(JSON.stringify({ columns:['tagId','label','trades','wins','losses','winRate','sumPnl','avgPnl'], rows }),{status:200, headers:{'Content-Type':'application/json'}});
  if(format==='xlsx'){
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows,{header:['tagId','label','trades','wins','losses','winRate','sumPnl','avgPnl']});
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Tags');
    const out = XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer;
  return new Response(new Uint8Array(out as ArrayBuffer),{status:200, headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="tag-performance.xlsx"'}});
  }
  const headers = ['tagId','label','trades','wins','losses','winRate','sumPnl','avgPnl'];
  const stream = rowsToCsvStream(headers, rows as unknown as Record<string, unknown>[]);
  return new Response(stream,{status:200, headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="tag-performance.csv"'}});
}