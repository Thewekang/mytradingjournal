import { withContext as _withContext, logger } from '@/lib/logger';
import { initObservability, withObservabilityScope, captureException } from '@/lib/observability';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Helper to standardize JSON success response
export function jsonOk(data: unknown, status = 200, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify({ data, error: null }), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

// Helper to standardize JSON error response
export function jsonError(error: { code: string; message: string; details?: unknown }, status = 400, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify({ data: null, error }), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

/**
 * Wrap an API route handler to inject structured logging.
 * Captures duration, status, and error; attaches request id and user id if present.
 */
export function withLogging<T extends (...args: any[]) => Promise<Response>>(handler: T, route: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return async (...args: Parameters<T>): Promise<Response> => {
  await initObservability();
    const start = Date.now();
    const req: Request = args[0] as unknown as Request;
    const reqId = req.headers.get('x-request-id') || 'no-rid';
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions); // lightweight; already cached per request in Next
      userId = (session?.user as { id?: string } | undefined)?.id;
    } catch {/* ignore */}
  // Defensive: some test module loading edge cases produced a non-function import; fallback directly to logger.child
  const withContextFn = typeof _withContext === 'function' ? _withContext : ((ctx: { reqId?: string; userId?: string; route?: string }) => logger.child(ctx));
  
  try {
    const log = withContextFn({ reqId, userId, route });
    log.debug({ method: req.method, url: req.url }, 'request.start');
    try {
      const res = await withObservabilityScope({ reqId, userId, route }, async () => await handler(...args));
      const dur = Date.now() - start;
      try {
        log.info({ status: res.status, dur }, 'request.finish');
      } catch {
        // Fallback logging if worker thread fails
        console.warn(`[${new Date().toISOString()}] ${route} ${res.status} ${dur}ms`);
      }
      // Ensure correlation header is present on all responses
      try { res.headers.set('x-request-id', reqId); } catch {/* ignore header set failure */}
      return res;
    } catch (e) {
      const dur = Date.now() - start;
      try {
        log.error({ err: (e as Error).message, stack: (e as Error).stack, dur }, 'request.error');
      } catch {
        // Fallback logging if worker thread fails
        console.error(`[${new Date().toISOString()}] ${route} ERROR ${dur}ms:`, (e as Error).message);
      }
      captureException(e, { reqId, userId, route });
      return new Response(JSON.stringify({ data: null, error: { code: 'INTERNAL', message: 'Internal error' } }), { status: 500, headers: { 'Content-Type': 'application/json', 'x-request-id': reqId } });
    }
  } catch (workerError) {
    // Fallback if entire logging system fails
    console.error(`[${new Date().toISOString()}] Logger worker failed for ${route}:`, workerError);
    try {
      const res = await handler(...args);
      console.warn(`[${new Date().toISOString()}] ${route} ${res.status} (fallback)`);
      return res;
    } catch (e) {
      console.error(`[${new Date().toISOString()}] ${route} ERROR (fallback):`, (e as Error).message);
      return new Response(JSON.stringify({ data: null, error: { code: 'INTERNAL', message: 'Internal error' } }), { status: 500, headers: { 'Content-Type': 'application/json', 'x-request-id': reqId } });
    }
  }
  };
}
