import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { rowsToCsv } from '@/lib/export/csv';

interface GoalExportRow { [k: string]: string | number | '' }
async function generateXlsx(rows: GoalExportRow[], headers: string[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Goals');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out as ArrayBuffer);
}


export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'csv').toLowerCase();
  const defaultCols = ['id','type','period','targetValue','currentValue','startDate','endDate','achievedAt','windowDays'];
  const colsParam = searchParams.getAll('col');
  const cols = colsParam.length ? colsParam.filter(c => defaultCols.includes(c)) : defaultCols;
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });
  type GoalEntity = (typeof goals)[number];
  const rows: GoalExportRow[] = goals.map((g: GoalEntity): GoalExportRow => {
    const base: GoalExportRow = {
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
    return cols.reduce<GoalExportRow>((acc, c) => { acc[c] = base[c]; return acc; }, {} as GoalExportRow);
  });
  if (format === 'json') {
    return new Response(JSON.stringify({ columns: cols, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (format === 'xlsx') {
    const bin = await generateXlsx(rows, cols);
    return new Response(bin, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="goals-export.xlsx"' } });
  }
  return new Response(rowsToCsv(cols, rows as unknown as Record<string, unknown>[]), { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="goals-export.csv"' } });
}