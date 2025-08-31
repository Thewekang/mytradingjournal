import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { SOFT_DELETE_UNDO_WINDOW_MS } from '../lib/constants.js';

const prisma = new PrismaClient();

(async () => {
  const cutoff = new Date(Date.now() - SOFT_DELETE_UNDO_WINDOW_MS);
  const result = await prisma.trade.deleteMany({ where: { deletedAt: { lt: cutoff } } });
  console.log(`Purged ${result.count} soft-deleted trades older than undo window`);
  await prisma.$disconnect();
})();
