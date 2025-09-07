import { describe, it, expect } from 'vitest';
import { summarize, ExportPerfRow } from '@/lib/hooks/use-export-performance';

describe('export performance summarize', () => {
  const base: Omit<ExportPerfRow,'jobId'|'createdAt'> = {
    waitMs: 0,
    durMs: 0,
    sizeBytes: 0,
    streamed: false,
    streamedChunks: 0,
    streamedBytes: 0,
    avgChunkMs: 0,
    avgChunkBytes: 0,
    attempt: 0,
  };

  function row(overrides: Partial<ExportPerfRow>): ExportPerfRow {
    return { jobId: Math.random().toString(36).slice(2), createdAt: Date.now(), ...base, ...overrides } as ExportPerfRow;
  }

  it('returns zeros for empty set', () => {
    const s = summarize([]);
    expect(s.count).toBe(0);
    expect(s.p50Dur).toBe(0);
  });

  it('computes p50/p95 and averages', () => {
    const rows: ExportPerfRow[] = [
      row({ durMs: 100, waitMs: 10, sizeBytes: 1024 }),
      row({ durMs: 200, waitMs: 20, sizeBytes: 2048 }),
      row({ durMs: 300, waitMs: 30, sizeBytes: 4096, streamed: true }),
      row({ durMs: 400, waitMs: 40, sizeBytes: 8192 }),
      row({ durMs: 500, waitMs: 50, sizeBytes: 16384 }),
    ];
    const s = summarize(rows);
    expect(s.count).toBe(5);
    expect(s.streamedCount).toBe(1);
    // p50 index floor(0.5 * 5)=2 -> 300
    expect(s.p50Dur).toBe(300);
    expect(s.p95Dur).toBe(500);
    // wait percentiles
    expect(s.p50Wait).toBe(30);
    expect(s.p95Wait).toBe(50);
    // average size: (1+2+4+8+16) KB / 5 = 31 KB /5 = 6.2 KB
    expect(s.avgSizeKB).toBeCloseTo(6.2,1);
    // throughput average > 0
    expect(s.avgThroughputKBs).toBeGreaterThan(0);
  });
});
