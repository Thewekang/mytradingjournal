import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { validateDailyEquity, rebuildDailyEquity } from '@/lib/services/daily-equity-service';
import { prisma } from '@/lib/prisma';

// GET: validation report
export async function GET(){
  const session = await getServerSession(authOptions);
  if(!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const result = await validateDailyEquity(session.user.id);
  const settings = await prisma.journalSettings.findUnique({ where: { userId: session.user.id } });
  return Response.json({ data: { ...result, lastEquityValidationAt: settings?.lastEquityValidationAt ?? null, lastEquityRebuildAt: settings?.lastEquityRebuildAt ?? null } });
}

// POST: optional trigger full rebuild (idempotent) then return validation
export async function POST(){
  const session = await getServerSession(authOptions);
  if(!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  await rebuildDailyEquity(session.user.id);
  const result = await validateDailyEquity(session.user.id);
  const settings = await prisma.journalSettings.findUnique({ where: { userId: session.user.id } });
  return Response.json({ data: { ...result, lastEquityValidationAt: settings?.lastEquityValidationAt ?? null, lastEquityRebuildAt: settings?.lastEquityRebuildAt ?? null } });
}
