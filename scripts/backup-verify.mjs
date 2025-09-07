import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const start = Date.now();
  const [users, trades, exportsCount, equity] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count(),
    prisma.exportJob.count(),
    prisma.dailyEquity.count(),
  ]);

  // Fetch a couple of recent records for smoke testing
  const recentTrades = await prisma.trade.findMany({
    take: 3,
    orderBy: { entryAt: 'desc' },
    select: { id: true, userId: true, instrumentId: true, entryAt: true, exitAt: true },
  });

  console.log('Backup verification summary:');
  console.log({ users, trades, exports: exportsCount, equity });
  console.log('Recent trades sample:', recentTrades);
  console.log(`Elapsed ms: ${Date.now() - start}`);
}

verify().catch((e) => {
  console.error('Backup verification failed:', e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
