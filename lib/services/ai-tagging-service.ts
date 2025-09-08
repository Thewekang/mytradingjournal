// AI Tagging Suggestions Service
import { prisma } from '../prisma';

interface TagSuggestion {
  tagId: string;
  label: string;
  color: string;
  confidence: number;
  reason: string;
}

interface TradeSuggestions {
  tags: TagSuggestion[];
  reason?: string;
  lesson?: string;
}

const KEYWORD_TAG_MAPPING = {
  // Emotional tags
  'fomo': { pattern: /\b(fomo|fear of missing|missed out|rushed|impulsive)\b/i, tagPrefix: 'Emotion:FOMO' },
  'greed': { pattern: /\b(greed|greedy|too big|oversized|added too much)\b/i, tagPrefix: 'Emotion:Greed' },
  'fear': { pattern: /\b(fear|scared|afraid|anxious|nervous|panic)\b/i, tagPrefix: 'Emotion:Fear' },
  'revenge': { pattern: /\b(revenge|get back|make up|double down)\b/i, tagPrefix: 'Emotion:Revenge' },
  
  // Setup tags
  'breakout': { pattern: /\b(breakout|break out|broke above|broke below|resistance break|support break)\b/i, tagPrefix: 'Setup:Breakout' },
  'pullback': { pattern: /\b(pullback|retest|retracement|dip buy|buy the dip)\b/i, tagPrefix: 'Setup:Pullback' },
  'trend': { pattern: /\b(trend|trending|momentum|direction|uptrend|downtrend)\b/i, tagPrefix: 'Setup:Trend' },
  'reversal': { pattern: /\b(reversal|reverse|turn|bottom|top|exhaustion)\b/i, tagPrefix: 'Setup:Reversal' },
  
  // Market context
  'news': { pattern: /\b(news|earnings|announcement|fed|report|economic|catalyst)\b/i, tagPrefix: 'Context:News' },
  'levels': { pattern: /\b(support|resistance|level|zone|area|key level)\b/i, tagPrefix: 'Context:Levels' },
  'volume': { pattern: /\b(volume|vol|high volume|low volume|unusual activity)\b/i, tagPrefix: 'Context:Volume' },
  
  // Risk management
  'stop': { pattern: /\b(stop|stop loss|cut loss|exit|protect)\b/i, tagPrefix: 'Risk:StopLoss' },
  'sizing': { pattern: /\b(size|sizing|position size|too big|too small|risk)\b/i, tagPrefix: 'Risk:Sizing' },
  'patience': { pattern: /\b(patience|patient|wait|waiting|timing|early|late)\b/i, tagPrefix: 'Risk:Timing' }
};

const LOSS_PATTERN_REASONS = [
  'Consider reducing position size after consecutive losses',
  'Take a break to avoid emotional trading',
  'Review setup criteria - may be taking marginal trades',
  'Market conditions may have changed - reassess strategy'
];

const WIN_PATTERN_LESSONS = [
  'Good patience waiting for setup confirmation',
  'Risk management worked well - stick to plan',
  'Market timing was excellent',
  'Setup recognition improving'
];

export async function generateTagSuggestions(
  userId: string,
  tradeData: {
    notes?: string;
    reason?: string;
    lesson?: string;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    direction: 'LONG' | 'SHORT';
    instrumentId: string;
  }
): Promise<TradeSuggestions> {
  try {
    // Get user's existing tags
    const userTags = await prisma.tradeTag.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, label: true, color: true }
    });

    const suggestions: TagSuggestion[] = [];
    let suggestedReason: string | undefined;
    let suggestedLesson: string | undefined;

    // Combine all text fields for analysis
    const allText = [tradeData.notes, tradeData.reason, tradeData.lesson]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Keyword-based tag suggestions
    for (const [keyword, config] of Object.entries(KEYWORD_TAG_MAPPING)) {
      if (config.pattern.test(allText)) {
        const matchingTag = userTags.find(tag => 
          tag.label.toLowerCase().includes(keyword) || 
          tag.label.toLowerCase().includes(config.tagPrefix.toLowerCase().split(':')[1] || keyword)
        );
        
        if (matchingTag) {
          suggestions.push({
            tagId: matchingTag.id,
            label: matchingTag.label,
            color: matchingTag.color,
            confidence: 0.8,
            reason: `Detected "${keyword}" patterns in trade notes`
          });
        }
      }
    }

    // Analyze recent trade history for pattern-based suggestions
    const recentTrades = await prisma.trade.findMany({
      where: {
        userId,
        exitAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      },
      include: { instrument: true },
      orderBy: { exitAt: 'desc' },
      take: 10
    });

    // Calculate if this is a winning or losing trade
    const isWinningTrade = tradeData.exitPrice && (
      (tradeData.direction === 'LONG' && tradeData.exitPrice > tradeData.entryPrice) ||
      (tradeData.direction === 'SHORT' && tradeData.exitPrice < tradeData.entryPrice)
    );

    // Check for consecutive losses
    let consecutiveLosses = 0;
    for (const trade of recentTrades) {
      if (!trade.exitPrice) continue;
      
      const tradePnl = (trade.direction === 'LONG' ? 
        (trade.exitPrice - trade.entryPrice) : 
        (trade.entryPrice - trade.exitPrice)) * trade.quantity - trade.fees;
      
      if (tradePnl < 0) {
        consecutiveLosses++;
      } else {
        break;
      }
    }

    // Pattern-based suggestions
    if (consecutiveLosses >= 2) {
      const emotionTag = userTags.find(tag => tag.label.toLowerCase().includes('emotion'));
      if (emotionTag) {
        suggestions.push({
          tagId: emotionTag.id,
          label: emotionTag.label,
          color: emotionTag.color,
          confidence: 0.7,
          reason: `${consecutiveLosses} consecutive losses detected - emotional factor likely`
        });
      }
      
      if (!tradeData.reason) {
        suggestedReason = LOSS_PATTERN_REASONS[Math.floor(Math.random() * LOSS_PATTERN_REASONS.length)];
      }
    }

    // Winning trade lessons
    if (isWinningTrade && !tradeData.lesson) {
      suggestedLesson = WIN_PATTERN_LESSONS[Math.floor(Math.random() * WIN_PATTERN_LESSONS.length)];
    }

    // Time-of-day analysis
    const tradeHour = new Date().getHours();
    if ((tradeHour < 9 || tradeHour > 16) && !isWinningTrade) {
      if (!tradeData.reason) {
        suggestedReason = 'Consider if trading outside market hours affected execution quality';
      }
    }

    // Remove duplicates and limit suggestions
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.tagId === suggestion.tagId)
    ).slice(0, 5);

    return {
      tags: uniqueSuggestions,
      reason: suggestedReason,
      lesson: suggestedLesson
    };

  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    return { tags: [] };
  }
}

// Utility function to track suggestion acceptance rate
export async function trackSuggestionFeedback(
  userId: string,
  suggestionType: 'tag' | 'reason' | 'lesson',
  suggestion: string,
  accepted: boolean
) {
  try {
    // In a real implementation, you might want to store this in a separate table
    // For now, we'll use structured logging for analysis
    if (process.env.NODE_ENV === 'development') {
      console.warn(`AI Suggestion Feedback - User: ${userId}, Type: ${suggestionType}, Accepted: ${accepted}, Suggestion: ${suggestion}`);
    }
  } catch (error) {
    console.error('Error tracking suggestion feedback:', error);
  }
}
