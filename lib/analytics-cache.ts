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

function key(userId: string, bucket: string) {
  return `${userId}::${bucket}`;
}

export function getAnalyticsCache<T = AnalyticsCacheValue>(userId: string, bucket: string): T | null {
  const k = key(userId, bucket);
  const entry = store.get(k);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(k); return null; }
  return entry.value as T;
}

export function setAnalyticsCache(userId: string, bucket: string, value: AnalyticsCacheValue, ttlMs: number = DEFAULT_TTL_MS) {
  store.set(key(userId, bucket), { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateAnalyticsCache(userId: string) {
  const prefix = `${userId}::`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function clearAllAnalyticsCache() { store.clear(); }
