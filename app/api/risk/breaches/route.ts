import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const logs = await prisma.riskBreachLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ data: logs });
}
