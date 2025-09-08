import { prisma } from '../prisma';
import { z } from 'zod';
import { computeRealizedPnl } from './trade-service';

const strategyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

const strategyUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional()
});

export interface StrategyWithStats {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tradeCount: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
  createdAt: Date;
  updatedAt: Date;
  trades: Array<{
    id: string;
    direction: string;
    entryPrice: number;
    exitPrice: number | null;
    quantity: number;
    fees: number;
    entryAt: Date;
    exitAt: Date | null;
    status: string;
    instrument: {
      symbol: string;
      contractMultiplier: number | null;
    };
    realizedPnl: number | null;
  }>;
}

export async function createStrategy(userId: string, data: unknown) {
  const parsed = strategyCreateSchema.parse(data);
  
  return await prisma.strategy.create({
    data: {
      ...parsed,
      userId
    }
  });
}

export async function listStrategies(userId: string): Promise<StrategyWithStats[]> {
  const strategies = await prisma.strategy.findMany({
    where: { 
      userId,
      deletedAt: null 
    },
    include: {
      trades: {
        where: { deletedAt: null },
        include: {
          instrument: {
            select: {
              symbol: true,
              contractMultiplier: true
            }
          }
        },
        orderBy: { entryAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return strategies.map(strategy => {
    const trades = strategy.trades.map(trade => {
      const realizedPnl = computeRealizedPnl({
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice ?? undefined,
        quantity: trade.quantity,
        direction: trade.direction as 'LONG' | 'SHORT',
        fees: trade.fees,
        contractMultiplier: trade.instrument?.contractMultiplier ?? undefined
      });

      return {
        id: trade.id,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        fees: trade.fees,
        entryAt: trade.entryAt,
        exitAt: trade.exitAt,
        status: trade.status,
        instrument: {
          symbol: trade.instrument.symbol,
          contractMultiplier: trade.instrument.contractMultiplier
        },
        realizedPnl
      };
    });

    // Calculate strategy statistics
    const closedTrades = trades.filter(t => t.exitPrice !== null && t.realizedPnl !== null);
    const winningTrades = closedTrades.filter(t => (t.realizedPnl ?? 0) > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
    const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;
    const avgPnl = closedTrades.length > 0 ? totalPnl / closedTrades.length : 0;

    return {
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      status: strategy.status,
      tradeCount: trades.length,
      totalPnl: +totalPnl.toFixed(2),
      winRate: +winRate.toFixed(4),
      avgPnl: +avgPnl.toFixed(2),
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
      trades
    };
  });
}

export async function getStrategy(userId: string, id: string): Promise<StrategyWithStats | null> {
  const strategy = await prisma.strategy.findFirst({
    where: { 
      id,
      userId,
      deletedAt: null 
    },
    include: {
      trades: {
        where: { deletedAt: null },
        include: {
          instrument: {
            select: {
              symbol: true,
              contractMultiplier: true
            }
          }
        },
        orderBy: { entryAt: 'desc' }
      }
    }
  });

  if (!strategy) return null;

  const strategies = await listStrategies(userId);
  return strategies.find(s => s.id === id) ?? null;
}

export async function updateStrategy(userId: string, id: string, data: unknown) {
  const parsed = strategyUpdateSchema.parse(data);
  
  const existing = await prisma.strategy.findFirst({
    where: { 
      id,
      userId,
      deletedAt: null 
    }
  });

  if (!existing) return null;

  return await prisma.strategy.update({
    where: { id },
    data: parsed
  });
}

export async function deleteStrategy(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.strategy.findFirst({
    where: { 
      id,
      userId,
      deletedAt: null 
    }
  });

  if (!existing) return false;

  // Soft delete the strategy and unlink trades
  await prisma.$transaction([
    prisma.strategy.update({
      where: { id },
      data: { deletedAt: new Date() }
    }),
    prisma.trade.updateMany({
      where: { strategyId: id },
      data: { strategyId: null }
    })
  ]);

  return true;
}

export async function addTradeToStrategy(userId: string, strategyId: string, tradeId: string): Promise<boolean> {
  // Verify both strategy and trade belong to user
  const [strategy, trade] = await Promise.all([
    prisma.strategy.findFirst({
      where: { 
        id: strategyId,
        userId,
        deletedAt: null 
      }
    }),
    prisma.trade.findFirst({
      where: { 
        id: tradeId,
        userId,
        deletedAt: null 
      }
    })
  ]);

  if (!strategy || !trade) return false;

  await prisma.trade.update({
    where: { id: tradeId },
    data: { strategyId }
  });

  return true;
}

export async function removeTradeFromStrategy(userId: string, tradeId: string): Promise<boolean> {
  const trade = await prisma.trade.findFirst({
    where: { 
      id: tradeId,
      userId,
      deletedAt: null 
    }
  });

  if (!trade) return false;

  await prisma.trade.update({
    where: { id: tradeId },
    data: { strategyId: null }
  });

  return true;
}
