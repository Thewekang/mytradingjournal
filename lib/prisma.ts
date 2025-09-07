// Prisma client singleton to avoid hot-reload duplication in dev
import { PrismaClient } from '@prisma/client';

declare global {
  var __PRISMA__: PrismaClient | undefined;
  var __USER_SETTINGS_MW__: boolean | undefined;
}

const client = global.__PRISMA__ ?? new PrismaClient();

// Type guard for created user result (middleware result is unknown generically)
function hasUserId(result: unknown): result is { id: string } {
  return typeof result === 'object' && result !== null && typeof (result as { id?: unknown }).id === 'string';
}

// Middleware: after a User is created ensure related baseline entities exist.
type MiddlewareParams = { model?: string; action: string };
type MiddlewareNext = (p: MiddlewareParams) => Promise<unknown>;

if (!global.__USER_SETTINGS_MW__ && typeof (client as unknown as { $use?: unknown }).$use === 'function') {
  (client as unknown as { $use: (fn: (p: MiddlewareParams, n: MiddlewareNext) => Promise<unknown>) => void }).$use(async (params, next) => {
    const result = await next(params);
    if (params.model === 'User' && params.action === 'create' && hasUserId(result)) {
      const userId = result.id;
      try {
        // 1. Ensure JournalSettings exists
        await client.journalSettings.upsert({ where: { userId }, update: {}, create: { userId } });

        // 2. Seed global instruments (idempotent)
        const DEFAULT_INSTRUMENTS: Array<{
          symbol: string; name: string; category: string; currency: string; tickSize: number; contractMultiplier: number | null;
        }> = [
          { symbol: 'ES', name: 'E-Mini S&P 500', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 50 },
          { symbol: 'NQ', name: 'E-Mini Nasdaq 100', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 20 },
          { symbol: 'GC', name: 'Gold Futures', category: 'Futures', currency: 'USD', tickSize: 0.1, contractMultiplier: 100 },
          { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', currency: 'USD', tickSize: 1, contractMultiplier: null },
          { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'Forex', currency: 'USD', tickSize: 0.0001, contractMultiplier: null }
        ];
        for (const inst of DEFAULT_INSTRUMENTS) {
          // upsert ensures idempotency; sequential keeps load trivial at this small list size
          await client.instrument.upsert({ where: { symbol: inst.symbol }, update: {}, create: inst });
        }

        // 3. Seed user default tags if absent
        // Store semantic token identifiers instead of raw hex; UI layer interprets 'token:--color-*' to CSS var.
        const DEFAULT_TAGS: Array<{ label: string; color: string }> = [
          { label: 'Setup:A', color: 'token:--color-accent' },
          { label: 'Emotion:FOMO', color: 'token:--color-danger' },
          { label: 'Playbook:Breakout', color: 'token:--color-info' }
        ];
        const existing = await client.tradeTag.findMany({
          where: { userId, label: { in: DEFAULT_TAGS.map(t => t.label) } },
          select: { label: true }
        });
        const existingLabels = new Set(existing.map(e => e.label));
        for (const tag of DEFAULT_TAGS) {
          if (!existingLabels.has(tag.label)) {
            await client.tradeTag.create({ data: { ...tag, userId } });
          }
        }
      } catch (e) {
        // swallow to avoid blocking auth flow; log in dev
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Auto settings seed failed', e);
        }
      }
    }
    return result;
  });
  global.__USER_SETTINGS_MW__ = true;
}

export const prisma: PrismaClient = client;

if (process.env.NODE_ENV !== 'production') {
  global.__PRISMA__ = prisma;
}
