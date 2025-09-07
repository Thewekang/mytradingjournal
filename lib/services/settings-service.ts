import { prisma } from '../prisma';
import { settingsUpdateSchema } from '../validation/trade';
import { mapPrismaError } from '../errors';

export async function getSettings(userId: string) {
  return prisma.journalSettings.findUnique({ where: { userId } });
}

export async function updateSettings(userId: string, data: unknown) {
  const parsed = settingsUpdateSchema.parse(data);
  try {
    return await prisma.journalSettings.upsert({
      where: { userId },
      update: parsed,
      create: { userId, baseCurrency: parsed.baseCurrency ?? 'USD', riskPerTradePct: parsed.riskPerTradePct ?? 1, maxDailyLossPct: parsed.maxDailyLossPct ?? 3, initialEquity: parsed.initialEquity ?? 100000, maxConsecutiveLossesThreshold: parsed.maxConsecutiveLossesThreshold ?? 5, timezone: parsed.timezone ?? 'UTC', theme: parsed.theme ?? 'dark', highContrast: parsed.highContrast ?? false }
    });
  } catch (e) {
    throw mapPrismaError(e);
  }
}
