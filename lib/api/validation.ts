import { z } from 'zod';

export const dateParamSchema = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,'invalid date YYYY-MM-DD');
export const equityRangeQuerySchema = z.object({
  from: dateParamSchema.optional(),
  to: dateParamSchema.optional()
}).refine(v => !v.from || !v.to || v.from <= v.to, { message: 'from must be <= to' });

export const exportCreateSchema = z.object({
  type: z.enum(['trades','goals','dailyPnl','tagPerformance','chartEquity','propEvaluation']),
  format: z.enum(['csv','json','xlsx','png']),
  limit: z.number().int().positive().max(20000).optional(),
});

export type EquityRangeQuery = z.infer<typeof equityRangeQuerySchema>;
