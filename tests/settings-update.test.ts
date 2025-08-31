import { describe, it, expect } from 'vitest';
import { settingsUpdateSchema } from '@/lib/validation/trade';

describe('settingsUpdateSchema', () => {
  it('accepts new risk fields', () => {
    const parsed = settingsUpdateSchema.parse({
      baseCurrency: 'USD',
      riskPerTradePct: 1.2,
      maxDailyLossPct: 4,
      initialEquity: 150000,
      maxConsecutiveLossesThreshold: 7,
      timezone: 'UTC',
      theme: 'light',
      highContrast: true
    });
    expect(parsed.initialEquity).toBe(150000);
    expect(parsed.maxConsecutiveLossesThreshold).toBe(7);
    expect(parsed.theme).toBe('light');
    expect(parsed.highContrast).toBe(true);
  });

  it('rejects invalid equity', () => {
    expect(() => settingsUpdateSchema.parse({ initialEquity: -10 })).toThrow();
  });
});
