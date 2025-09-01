import { prisma } from '../prisma';
import { instrumentCreateSchema } from '../validation/trade';
import { mapPrismaError } from '../errors';

export async function listInstruments() {
  // user filtering placeholder if/when instruments become user-scoped
  return prisma.instrument.findMany({ where: { isActive: true }, orderBy: { symbol: 'asc' } });
}

// Maintain backward-compatible signature (userId, data) even though userId is unused for now.
// This avoids breaking existing tests/routes while keeping future extensibility.
export async function createInstrument(_userId: string, data: unknown) {
  const parsed = instrumentCreateSchema.parse(data);
  try {
    return await prisma.instrument.create({ data: parsed });
  } catch (e) {
    throw mapPrismaError(e);
  }
}
