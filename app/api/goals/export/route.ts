import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { rowsToCsv } from '@/lib/export/csv';

async function generateXlsx(rows: any[], headers: string[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Goals');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out as any);
}


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'csv').toLowerCase();
  const defaultCols = ['id','type','period','targetValue','currentValue','startDate','endDate','achievedAt','windowDays'];
  const colsParam = searchParams.getAll('col');
  const cols = colsParam.length ? colsParam.filter(c => defaultCols.includes(c)) : defaultCols;
  const goals = await prisma.goal.findMany({ where: { userId } });
  const rows = goals.map((g: any) => {
    const base: Record<string, any> = {
      id: g.id,
      type: g.type,
      period: g.period,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      startDate: g.startDate.toISOString(),
      endDate: g.endDate.toISOString(),
      achievedAt: g.achievedAt ? g.achievedAt.toISOString() : '',
      windowDays: g.windowDays ?? ''
    };
    return cols.reduce((acc: Record<string, any>, c) => { acc[c] = base[c]; return acc; }, {});
  });
  if (format === 'json') {
    return new Response(JSON.stringify({ columns: cols, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (format === 'xlsx') {
    const bin = await generateXlsx(rows, cols);
    return new Response(bin, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="goals-export.xlsx"' } });
  }
  return new Response(rowsToCsv(cols, rows as any), { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="goals-export.csv"' } });
}