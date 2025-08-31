// Simple in-memory TTL cache for per-user analytics results.
// Not suitable for multi-instance horizontal scaling; acts as a local optimization.

interface CacheEntry { value: any; expiresAt: number }
const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 60_000; // 60s

function key(userId: string, bucket: string) {
  return `${userId}::${bucket}`;
}

export function getAnalyticsCache<T=any>(userId: string, bucket: string): T | null {
  const k = key(userId, bucket);
  const entry = store.get(k);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(k); return null; }
  return entry.value as T;
}

export function setAnalyticsCache(userId: string, bucket: string, value: any, ttlMs: number = DEFAULT_TTL_MS) {
  store.set(key(userId, bucket), { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateAnalyticsCache(userId: string) {
  const prefix = `${userId}::`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function clearAllAnalyticsCache() { store.clear(); }
