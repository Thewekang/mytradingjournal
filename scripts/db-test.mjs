import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('Connection OK', r);
}

main().catch(e => {
  console.error('Connection FAIL', e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
