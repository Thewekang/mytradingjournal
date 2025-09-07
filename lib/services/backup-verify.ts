import { prisma } from '@/lib/prisma';

export interface BackupVerificationSummary {
  counts: { users: number; trades: number; exports: number; equity: number };
  recentTrades: Array<{ id: string; userId: string; instrumentId: string | null; entryAt: string; exitAt: string | null }>;
  elapsedMs: number;
}

// Runs a lightweight DB verification similar to scripts/backup-verify.mjs but returns structured data
export async function backupVerificationSummary(): Promise<BackupVerificationSummary> {
  const start = Date.now();
  const [users, trades, exportsCount, equity] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count(),
    prisma.exportJob.count(),
    prisma.dailyEquity.count(),
  ]);

  const recentTradesRaw = await prisma.trade.findMany({
    take: 3,
    orderBy: { entryAt: 'desc' },
    select: { id: true, userId: true, instrumentId: true, entryAt: true, exitAt: true },
  });

  const recentTrades = recentTradesRaw.map(t => ({
    id: t.id,
    userId: t.userId,
    instrumentId: t.instrumentId,
    entryAt: t.entryAt.toISOString(),
    exitAt: t.exitAt ? t.exitAt.toISOString() : null,
  }));

  return {
    counts: { users, trades, exports: exportsCount, equity },
    recentTrades,
    elapsedMs: Date.now() - start,
  };
}
