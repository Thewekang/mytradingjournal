// Simple in-memory TTL cache for per-user analytics results.
// Not suitable for multi-instance horizontal scaling; acts as a local optimization.

// Enumerate known analytics cache value shapes as we migrate away from any.
// Extend this union as additional analytics buckets are typed.
export interface DailyPnlSeries { days: { date: string; pnl: number }[] }
export interface EquityCurvePoint { date: string; equity: number }
export interface EquityCurveSeries { points: EquityCurvePoint[] }
export interface TagPerformanceItem { tagId: string; trades: number; pnl: number }
export interface TagPerformanceSummary { items: TagPerformanceItem[] }

export type AnalyticsCacheValue =
  | DailyPnlSeries
  | EquityCurveSeries
  | TagPerformanceSummary
  | number
  | { [k: string]: unknown } // fallback for transitional buckets
  | null;

interface CacheEntry { value: AnalyticsCacheValue; expiresAt: number }
const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 60_000; // 60s
let MAX_ENTRIES = 1_000; // simple LRU-ish cap; tune via env later if needed (mutable for tests)

// Lightweight metrics for observability
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  evictions: 0,
  invalidations: 0,
};

function key(userId: string, bucket: string) {
  return `${userId}::${bucket}`;
}

export function getAnalyticsCache<T = AnalyticsCacheValue>(userId: string, bucket: string): T | null {
  const k = key(userId, bucket);
  const entry = store.get(k);
  if (!entry) { metrics.misses++; return null; }
  if (Date.now() > entry.expiresAt) { store.delete(k); metrics.misses++; return null; }
  // refresh recency on get (LRU behavior): reinsert same entry to move it to the end
  store.delete(k);
  store.set(k, entry);
  metrics.hits++;
  return entry.value as T;
}

export function setAnalyticsCache(userId: string, bucket: string, value: AnalyticsCacheValue, ttlMs: number = DEFAULT_TTL_MS) {
  const k = key(userId, bucket);
  // refresh insertion order by deleting pre-existing key
  if (store.has(k)) store.delete(k);
  store.set(k, { value, expiresAt: Date.now() + ttlMs });
  metrics.sets++;
  // evict oldest entries if over cap (Map preserves insertion order)
  if (store.size > MAX_ENTRIES) {
    const toRemove = store.size - MAX_ENTRIES;
    let i = 0;
    for (const oldestKey of store.keys()) {
      store.delete(oldestKey);
      metrics.evictions++;
      if (++i >= toRemove) break;
    }
  }
}

export function invalidateAnalyticsCache(userId: string) {
  const prefix = `${userId}::`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) { store.delete(k); metrics.invalidations++; }
  }
}

export function clearAllAnalyticsCache() { store.clear(); }

export function getAnalyticsCacheStats() {
  return {
    entries: store.size,
    ...metrics,
    maxEntries: MAX_ENTRIES,
  };
}

// Test-only helper to adjust LRU cap deterministically
export function __setCacheMaxEntriesForTest(n: number) {
  MAX_ENTRIES = Math.max(1, Math.floor(n));
}

// Test-only helper to reset metrics between tests
export function __resetCacheMetricsForTest() {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.evictions = 0;
  metrics.invalidations = 0;
}
