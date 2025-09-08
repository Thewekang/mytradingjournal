import { NextRequest } from 'next/server';
import { withLogging, jsonOk } from '@/lib/api/logger-wrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { listStrategies, createStrategy } from '@/lib/services/strategy-service';
import { unauthorized, internal, isApiErrorShape, httpStatusForError } from '@/lib/errors';
import { z } from 'zod';

const strategyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

async function _GET() {
  const session = await getServerSession(authOptions);
  const userId = typeof session?.user === 'object' && session.user && 'id' in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });

  try {
    const strategies = await listStrategies(userId);
    return jsonOk(strategies);
  } catch (error) {
    console.error('Failed to list strategies:', error);
    if (isApiErrorShape(error)) {
      return new Response(JSON.stringify({ data: null, error }), { status: httpStatusForError(error) });
    }
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = typeof session?.user === 'object' && session.user && 'id' in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return new Response(JSON.stringify({ data: null, error: unauthorized() }), { status: 401 });

  try {
    const body = await req.json();
    const parsed = strategyCreateSchema.parse(body);
    
    const strategy = await createStrategy(userId, parsed);
    return jsonOk(strategy);
  } catch (error) {
    console.error('Failed to create strategy:', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        data: null, 
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.issues } 
      }), { status: 400 });
    }
    if (isApiErrorShape(error)) {
      return new Response(JSON.stringify({ data: null, error }), { status: httpStatusForError(error) });
    }
    return new Response(JSON.stringify({ data: null, error: internal() }), { status: 500 });
  }
}

export const GET = withLogging(_GET, 'GET /api/strategies');
export const POST = withLogging(_POST, 'POST /api/strategies');
