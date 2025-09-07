import { getAnalyticsCache, setAnalyticsCache } from '@/lib/analytics-cache';

export async function cached<T>(userId: string, bucket: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const existing = getAnalyticsCache<T>(userId, bucket);
  if (existing) return existing;
  const val = await fn();
  setAnalyticsCache(userId, bucket, val as any, ttlMs); // eslint-disable-line @typescript-eslint/no-explicit-any
  return val;
}
