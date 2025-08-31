// Prisma client singleton to avoid hot-reload duplication in dev
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const client = global.__PRISMA__ ?? new PrismaClient();

// Middleware: auto-create JournalSettings & seed baseline data (instruments + default tags) after User creation
if (typeof (client as any).$use === 'function' && !(global as any).__USER_SETTINGS_MW__) {
  ;(client as any).$use(async (params: any, next: (params: any) => Promise<any>) => {
    const result = await next(params);
    try {
      if (params.model === 'User' && params.action === 'create') {
        const userId = (result as any).id;
        // 1. Ensure JournalSettings exists
        await client.journalSettings.upsert({ where: { userId }, update: {}, create: { userId } });

        // 2. Seed global instruments (idempotent). Only needs to exist once globally.
        const DEFAULT_INSTRUMENTS = [
          { symbol: 'ES', name: 'E-Mini S&P 500', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 50 },
          { symbol: 'NQ', name: 'E-Mini Nasdaq 100', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 20 },
          { symbol: 'GC', name: 'Gold Futures', category: 'Futures', currency: 'USD', tickSize: 0.1, contractMultiplier: 100 },
          { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', currency: 'USD', tickSize: 1, contractMultiplier: null },
          { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'Forex', currency: 'USD', tickSize: 0.0001, contractMultiplier: null }
        ];
        for (const inst of DEFAULT_INSTRUMENTS) {
          // Upsert by unique symbol; ignore update to keep seed stable
          await client.instrument.upsert({ where: { symbol: inst.symbol }, update: {}, create: inst as any });
        }

        // 3. Seed user default tags if they don't already have them
        const DEFAULT_TAGS = [
          { label: 'Setup:A', color: '#3b82f6' },
            { label: 'Emotion:FOMO', color: '#ef4444' },
            { label: 'Playbook:Breakout', color: '#6366f1' }
        ];
        const existing: { label: string }[] = await client.tradeTag.findMany({
          where: { userId, label: { in: DEFAULT_TAGS.map(t => t.label) } },
          select: { label: true }
        });
        const existingLabels = new Set(existing.map((e: { label: string }) => e.label));
        for (const tag of DEFAULT_TAGS) {
          if (!existingLabels.has(tag.label)) {
            await client.tradeTag.create({ data: { ...tag, userId } });
          }
        }
      }
    } catch (e) {
      // swallow to avoid blocking auth flow; log in dev
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Auto settings seed failed', e);
      }
    }
    return result;
  });
  (global as any).__USER_SETTINGS_MW__ = true;
}

export const prisma: PrismaClient = client;

if (process.env.NODE_ENV !== 'production') {
  global.__PRISMA__ = prisma;
}
