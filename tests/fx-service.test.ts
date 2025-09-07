import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getFxRate, convertAmount } from '@/lib/services/fx-service';

// Narrow DB stub helpers via raw SQL; mark as [db] to skip if no DB configured

describe('fx-service', () => {
  const BASE = 'USD';
  const QUOTE = 'EUR';
  const DATE = '2024-01-02';
  let dbReady = false;

  beforeEach(async () => {
    // Clean specific day rows to ensure determinism
    try {
      await prisma.$executeRawUnsafe('DELETE FROM "FxRate" WHERE date = $1 AND base = $2 AND quote = $3', new Date(DATE + 'T00:00:00.000Z').toISOString(), BASE, QUOTE);
    } catch { /* ignore cleanup if table missing in ephemeral db */ }
    // Detect if FxRate table is available in the current dev DB (migrations may be partial locally)
    try {
      const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FxRate') AS exists"
      );
      dbReady = !!rows?.[0]?.exists;
    } catch {
      dbReady = false;
    }
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('[db] returns DB rate when present without fetching', async () => {
    if (!dbReady) return; // skip silently if table not present
    // Seed a rate
    await prisma.$executeRawUnsafe('INSERT INTO "FxRate" (id, date, base, quote, rate, source) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) ON CONFLICT (date, base, quote) DO UPDATE SET rate = EXCLUDED.rate', new Date(DATE + 'T00:00:00.000Z').toISOString(), BASE, QUOTE, 0.9, 'frankfurter');
  const spy = vi.spyOn(globalThis, 'fetch');
    const rate = await getFxRate(DATE, BASE, QUOTE);
    expect(rate).toBe(0.9);
    expect(spy).not.toHaveBeenCalled();
  });

  it('fetches from provider when missing and flag enabled, then upserts', async () => {
  vi.stubEnv('ENABLE_FX_CONVERSION', '1');
  const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ rates: { [QUOTE]: 0.88 } }) } as unknown as Response);
    const rate = await getFxRate(DATE, BASE, QUOTE);
    expect(rate).toBeCloseTo(0.88, 5);
    expect(mockFetch).toHaveBeenCalledOnce();
    // Verify persisted
    if (dbReady) {
      const rows = await prisma.$queryRawUnsafe<{ rate: number }[]>(
        'SELECT rate FROM "FxRate" WHERE date = $1 AND base = $2 AND quote = $3',
        new Date(DATE + 'T00:00:00.000Z').toISOString(), BASE, QUOTE
      );
      expect(rows?.[0]?.rate).toBeCloseTo(0.88, 5);
    }
  });

  it('returns identity for same currency', async () => {
    const r = await getFxRate(DATE, 'USD', 'USD');
    expect(r).toBe(1);
    expect(convertAmount(100, r)).toBe(100);
  });
});
