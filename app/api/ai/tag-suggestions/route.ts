import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isSessionUser } from '@/lib/session';
import { generateTagSuggestions } from '@/lib/services/ai-tagging-service';
import { jsonOk, jsonError } from '@/lib/api/logger-wrapper';
import { unauthorized, validationError, internal } from '@/lib/errors';
import { z } from 'zod';

const suggestionRequestSchema = z.object({
  notes: z.string().optional(),
  reason: z.string().optional(),
  lesson: z.string().optional(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  quantity: z.number().positive(),
  direction: z.enum(['LONG', 'SHORT']),
  instrumentId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const userId = isSessionUser(user) ? user.id : undefined;
    
    if (!userId) {
      return jsonError(unauthorized(), 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = suggestionRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError(validationError(parsed.error), 400);
    }

    const suggestions = await generateTagSuggestions(userId, parsed.data);
    
    return jsonOk({ suggestions });

  } catch (error) {
    console.error('AI tagging suggestions error:', error);
    return jsonError(internal(), 500);
  }
}
