import { prisma } from '@/lib/prisma';

// Lightweight optional accessor so we can centralize duck-typing fallback logic.
export interface DailyEquityClient {
  deleteMany?: (args: unknown) => Promise<unknown>;
  findFirst?: (args: unknown) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  findUnique?: (args: unknown) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  findMany?: (args: unknown) => Promise<any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
  upsert?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
}

export function getDailyEquityClient(): DailyEquityClient {
  const anyClient = prisma as unknown as { dailyEquity?: DailyEquityClient };
  return anyClient.dailyEquity || {};
}

// Fallback raw query helpers (used only when findMany absent)
export async function rawSelectDailyEquity(userId: string, range?: { gte?: Date; lte?: Date }) {
  const params: unknown[] = [userId];
  let sql = 'SELECT * FROM "DailyEquity" WHERE "userId" = $1';
  if (range?.gte) { params.push(range.gte); sql += ` AND "date" >= $${params.length}`; }
  if (range?.lte) { params.push(range.lte); sql += ` AND "date" <= $${params.length}`; }
  sql += ' ORDER BY "date" ASC';
  return prisma.$queryRawUnsafe(sql, ...params) as Promise<any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
