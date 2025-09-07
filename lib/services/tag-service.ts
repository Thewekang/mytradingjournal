import { prisma } from '../prisma';
import { tagCreateSchema } from '../validation/trade';
import { mapPrismaError } from '../errors';

export async function listTags(userId: string) {
  return prisma.tradeTag.findMany({ where: { OR: [{ userId }, { userId: null }] }, orderBy: { label: 'asc' } });
}

export async function createTag(userId: string, data: unknown) {
  const parsed = tagCreateSchema.parse(data);
  try {
    return await prisma.tradeTag.create({ data: { ...parsed, userId } });
  } catch (e) {
    throw mapPrismaError(e);
  }
}
