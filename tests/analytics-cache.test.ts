import { describe, it, expect, beforeEach } from 'vitest';
import { setAnalyticsCache, getAnalyticsCache, invalidateAnalyticsCache, clearAllAnalyticsCache, __setCacheMaxEntriesForTest, getAnalyticsCacheStats, __resetCacheMetricsForTest } from '@/lib/analytics-cache';

describe('analytics cache utility', () => {
  beforeEach(() => {
    clearAllAnalyticsCache();
    __resetCacheMetricsForTest();
    __setCacheMaxEntriesForTest(1000);
  });

  it('stores and retrieves value until TTL expires', async () => {
    setAnalyticsCache('u1','bucket',{ value: 42 }, 50);
    expect(getAnalyticsCache('u1','bucket')).toEqual({ value: 42 });
    await new Promise(r => setTimeout(r, 60));
    expect(getAnalyticsCache('u1','bucket')).toBeNull();
    const s = getAnalyticsCacheStats();
    expect(s.sets).toBeGreaterThanOrEqual(1);
  });
  it('invalidates all buckets for a user', () => {
    setAnalyticsCache('u2','a',1,1000);
    setAnalyticsCache('u2','b',2,1000);
    invalidateAnalyticsCache('u2');
    expect(getAnalyticsCache('u2','a')).toBeNull();
    expect(getAnalyticsCache('u2','b')).toBeNull();
    const s = getAnalyticsCacheStats();
    expect(s.invalidations).toBeGreaterThanOrEqual(1);
  });
  it('evicts oldest entries when exceeding max (LRU-ish)', () => {
    __setCacheMaxEntriesForTest(2);
    setAnalyticsCache('u3','a',1,1000);
    setAnalyticsCache('u3','b',2,1000);
    // touch 'a' to refresh recency
    expect(getAnalyticsCache('u3','a')).toBe(1);
    setAnalyticsCache('u3','c',3,1000);
    // b should be evicted
    expect(getAnalyticsCache('u3','b')).toBeNull();
    expect(getAnalyticsCache('u3','a')).toBe(1);
    expect(getAnalyticsCache('u3','c')).toBe(3);
    const s = getAnalyticsCacheStats();
    expect(s.evictions).toBeGreaterThanOrEqual(1);
  });
});
