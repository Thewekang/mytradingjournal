import { z } from 'zod';

export const tradeDirectionEnum = z.enum(['LONG', 'SHORT']);
export const tradeStatusEnum = z.enum(['OPEN', 'CLOSED', 'CANCELLED']);

export const tradeCreateSchema = z.object({
  instrumentId: z.string().min(1),
  direction: tradeDirectionEnum,
  entryPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1),
  leverage: z.number().positive().optional(),
  entryAt: z.string().datetime(),
  fees: z.number().nonnegative().default(0),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(25).optional()
});

export const tradeUpdateSchema = z.object({
  exitPrice: z.number().nonnegative().optional(),
  exitAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(1000).optional(),
  lesson: z.string().max(2000).optional(),
  status: tradeStatusEnum.optional(),
  tags: z.array(z.string()).max(25).optional()
}).refine(d => !(d.exitPrice && !d.exitAt) && !(d.exitAt && !d.exitPrice), {
  message: 'exitPrice and exitAt must be provided together',
  path: ['exitAt']
});

export const instrumentCreateSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  currency: z.string().length(3),
  tickSize: z.number().positive(),
  contractMultiplier: z.number().positive().optional()
});

export const tagCreateSchema = z.object({
  label: z.string().min(1).max(40),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/)
});

export const settingsUpdateSchema = z.object({
  baseCurrency: z.string().length(3).optional(),
  riskPerTradePct: z.number().positive().max(100).optional(),
  maxDailyLossPct: z.number().positive().max(100).optional(),
  initialEquity: z.number().positive().optional(),
  maxConsecutiveLossesThreshold: z.number().int().positive().max(100).optional(),
  timezone: z.string().max(60).optional(),
  theme: z.enum(['dark','light']).optional(),
  highContrast: z.boolean().optional()
});

export type TradeCreateInput = z.infer<typeof tradeCreateSchema>;
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;