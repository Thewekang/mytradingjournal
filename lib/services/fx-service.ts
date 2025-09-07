import { prisma } from '@/lib/prisma';

function isFxEnabled() {
  return process.env.ENABLE_FX_CONVERSION === '1';
}

export type FxSource = 'frankfurter';

// Simple in-memory cache for daily rates (keyed by requested date|base|quote)
const memCache = new Map<string, number>();
const MAX_FALLBACK_DAYS = 5; // previous business day fallback window

function keyOf(dateYYYYMMDD: string, base: string, quote: string) {
  return `${dateYYYYMMDD}|${base}|${quote}`;
}

function addDays(dateYYYYMMDD: string, delta: number) {
  const d = new Date(dateYYYYMMDD + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function getFxRate(dateISO: string, base: string, quote: string): Promise<number | null> {
  if (base === quote) return 1;
  const requested = dateISO.slice(0, 10); // YYYY-MM-DD
  const cacheKey = keyOf(requested, base, quote);
  const cached = memCache.get(cacheKey);
  if (cached != null) return cached;

  // Try DB and fallback window (same requested date first, then previous days)
  for (let i = 0; i <= MAX_FALLBACK_DAYS; i++) {
    const target = addDays(requested, -i);
    const targetTs = new Date(target + 'T00:00:00.000Z').toISOString();
    // DB lookup first
    try {
      type Row = { rate: number };
      const rows = await prisma.$queryRawUnsafe<Row[]>(
        'SELECT rate FROM "FxRate" WHERE date = $1 AND base = $2 AND quote = $3 LIMIT 1',
        targetTs,
        base,
        quote,
      );
      if (rows && rows.length) {
        const r = rows[0]?.rate;
        if (typeof r === 'number') {
          memCache.set(cacheKey, r);
          return r;
        }
      }
    } catch { /* ignore lookup errors */ }

  if (!isFxEnabled()) continue; // if provider disabled, only attempt DB lookups within the window

    // Fetch from provider (Frankfurter: ECB daily); it will itself return the last available business day
    const fetched = await fetchFrankfurter(target, base, quote);
    if (fetched != null) {
  // Upsert under the originally requested date for faster future lookups
      try {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "FxRate" (id, date, base, quote, rate, source) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)\n           ON CONFLICT (date, base, quote) DO UPDATE SET rate = EXCLUDED.rate, "updatedAt" = now()',
          new Date(requested + 'T00:00:00.000Z').toISOString(),
          base,
          quote,
          fetched,
          'frankfurter',
        );
      } catch { /* ignore */ }
      memCache.set(cacheKey, fetched);
      return fetched;
    }
  }
  return null;
}

async function fetchFrankfurter(dateISO: string, base: string, quote: string): Promise<number | null> {
  try {
    const url = `https://api.frankfurter.app/${dateISO}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    const rate = json?.rates?.[quote];
    return typeof rate === 'number' ? rate : null;
  } catch {
    return null;
  }
}

export function convertAmount(amount: number, rate: number | null): number {
  if (rate == null) return amount;
  return amount * rate;
}