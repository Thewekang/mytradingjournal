import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { withLogging } from '@/lib/api/logger-wrapper';

async function _GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const logs = await prisma.riskBreachLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ data: logs });
}
export const GET = withLogging(_GET, 'GET /api/risk/breaches');
