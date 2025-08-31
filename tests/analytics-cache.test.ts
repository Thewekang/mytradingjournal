import { describe, it, expect } from 'vitest';
import { setAnalyticsCache, getAnalyticsCache, invalidateAnalyticsCache, clearAllAnalyticsCache } from '@/lib/analytics-cache';

describe('analytics cache utility', () => {
  it('stores and retrieves value until TTL expires', async () => {
    clearAllAnalyticsCache();
    setAnalyticsCache('u1','bucket',{ value: 42 }, 50);
    expect(getAnalyticsCache('u1','bucket')).toEqual({ value: 42 });
    await new Promise(r => setTimeout(r, 60));
    expect(getAnalyticsCache('u1','bucket')).toBeNull();
  });
  it('invalidates all buckets for a user', () => {
    clearAllAnalyticsCache();
    setAnalyticsCache('u2','a',1,1000);
    setAnalyticsCache('u2','b',2,1000);
    invalidateAnalyticsCache('u2');
    expect(getAnalyticsCache('u2','a')).toBeNull();
    expect(getAnalyticsCache('u2','b')).toBeNull();
  });
});
