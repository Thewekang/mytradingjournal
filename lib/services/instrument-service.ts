import { prisma } from '../prisma';
import { instrumentCreateSchema } from '../validation/trade';
import { mapPrismaError } from '../errors';

export async function listInstruments(userId: string) {
  // user filtering later if ownership introduced; currently global instruments
  return prisma.instrument.findMany({ where: { isActive: true }, orderBy: { symbol: 'asc' } });
}

export async function createInstrument(userId: string, data: unknown) {
  const parsed = instrumentCreateSchema.parse(data);
  try {
    return await prisma.instrument.create({ data: parsed });
  } catch (e) {
    throw mapPrismaError(e);
  }
}
