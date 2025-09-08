import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateTagSuggestions, trackSuggestionFeedback } from '@/lib/services/ai-tagging-service';

// Mock Prisma
const mockPrisma = {
  tradeTag: {
    findMany: vi.fn()
  },
  trade: {
    findMany: vi.fn()
  }
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}));

describe('AI Tagging Service', () => {
  const userId = 'test-user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suggests emotion tags based on keyword patterns', async () => {
    mockPrisma.tradeTag.findMany.mockResolvedValue([
      { id: 'tag1', label: 'Emotion:FOMO', color: 'token:--color-danger' },
      { id: 'tag2', label: 'Setup:Breakout', color: 'token:--color-info' },
      { id: 'tag3', label: 'Risk:Sizing', color: 'token:--color-warning' }
    ]);

    mockPrisma.trade.findMany.mockResolvedValue([]);

    const tradeData = {
      notes: 'I rushed into this trade because I had FOMO and feared missing out',
      entryPrice: 100,
      exitPrice: 95,
      quantity: 1,
      direction: 'LONG' as const,
      instrumentId: 'inst1'
    };

    const suggestions = await generateTagSuggestions(userId, tradeData);

    expect(suggestions.tags).toHaveLength(1);
    expect(suggestions.tags[0].label).toBe('Emotion:FOMO');
    expect(suggestions.tags[0].confidence).toBe(0.8);
    expect(suggestions.tags[0].reason).toContain('fomo');
  });

  it('suggests setup tags based on trading patterns', async () => {
    mockPrisma.tradeTag.findMany.mockResolvedValue([
      { id: 'tag1', label: 'Setup:Breakout', color: 'token:--color-info' },
      { id: 'tag2', label: 'Context:Levels', color: 'token:--color-accent' }
    ]);

    mockPrisma.trade.findMany.mockResolvedValue([]);

    const tradeData = {
      reason: 'Strong breakout above resistance level with high volume',
      entryPrice: 100,
      exitPrice: 105,
      quantity: 1,
      direction: 'LONG' as const,
      instrumentId: 'inst1'
    };

    const suggestions = await generateTagSuggestions(userId, tradeData);

    expect(suggestions.tags.length).toBeGreaterThan(0);
    const breakoutTag = suggestions.tags.find(t => t.label.includes('Breakout'));
    const levelsTag = suggestions.tags.find(t => t.label.includes('Levels'));
    
    expect(breakoutTag).toBeDefined();
    expect(levelsTag).toBeDefined();
  });

  it('suggests reasons after consecutive losses', async () => {
    mockPrisma.tradeTag.findMany.mockResolvedValue([
      { id: 'tag1', label: 'Emotion:General', color: 'token:--color-danger' }
    ]);

    // Mock 3 consecutive losing trades
    mockPrisma.trade.findMany.mockResolvedValue([
      { exitPrice: 95, entryPrice: 100, direction: 'LONG', quantity: 1, fees: 0 }, // Loss
      { exitPrice: 90, entryPrice: 100, direction: 'LONG', quantity: 1, fees: 0 }, // Loss
      { exitPrice: 85, entryPrice: 100, direction: 'LONG', quantity: 1, fees: 0 }, // Loss
    ]);

    const tradeData = {
      entryPrice: 100,
      exitPrice: 95,
      quantity: 1,
      direction: 'LONG' as const,
      instrumentId: 'inst1'
    };

    const suggestions = await generateTagSuggestions(userId, tradeData);

    expect(suggestions.reason).toBeDefined();
    expect(suggestions.reason).toContain('consecutive losses');
  });

  it('suggests lessons for winning trades', async () => {
    mockPrisma.tradeTag.findMany.mockResolvedValue([]);
    mockPrisma.trade.findMany.mockResolvedValue([]);

    const tradeData = {
      entryPrice: 100,
      exitPrice: 110,
      quantity: 1,
      direction: 'LONG' as const,
      instrumentId: 'inst1'
    };

    const suggestions = await generateTagSuggestions(userId, tradeData);

    expect(suggestions.lesson).toBeDefined();
    expect(typeof suggestions.lesson).toBe('string');
  });

  it('handles multiple keyword matches without duplicates', async () => {
    mockPrisma.tradeTag.findMany.mockResolvedValue([
      { id: 'tag1', label: 'Emotion:FOMO', color: 'token:--color-danger' },
      { id: 'tag2', label: 'Setup:Breakout', color: 'token:--color-info' },
      { id: 'tag3', label: 'Risk:Sizing', color: 'token:--color-warning' }
    ]);

    mockPrisma.trade.findMany.mockResolvedValue([]);

    const tradeData = {
      notes: 'FOMO led to oversized position on breakout',
      reason: 'Strong breakout but took too big size',
      entryPrice: 100,
      quantity: 1,
      direction: 'LONG' as const,
      instrumentId: 'inst1'
    };

    const suggestions = await generateTagSuggestions(userId, tradeData);

    // Should not have duplicate tags
    const tagIds = suggestions.tags.map(t => t.tagId);
    const uniqueTagIds = [...new Set(tagIds)];
    expect(tagIds.length).toBe(uniqueTagIds.length);

    // Should suggest max 5 tags
    expect(suggestions.tags.length).toBeLessThanOrEqual(5);
  });

  it('tracks suggestion feedback without errors', async () => {
    // This should not throw
    await expect(
      trackSuggestionFeedback(userId, 'tag', 'Emotion:FOMO', true)
    ).resolves.toBeUndefined();

    await expect(
      trackSuggestionFeedback(userId, 'reason', 'Consider reducing size', false)
    ).resolves.toBeUndefined();
  });

  it('handles errors gracefully', async () => {
    mockPrisma.tradeTag.findMany.mockRejectedValue(new Error('Database error'));

    const tradeData = {
      entryPrice: 100,
      quantity: 1,
      direction: 'LONG' as const,
      instrumentId: 'inst1'
    };

    const suggestions = await generateTagSuggestions(userId, tradeData);

    expect(suggestions.tags).toEqual([]);
  });
});
