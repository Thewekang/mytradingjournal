// Minimal env-gated observability layer (Sentry optional). No compile-time deps.
// Uses dynamic import so builds work without @sentry/node installed.

type ScopeSetter = (scope: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

let _sentry: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
let _initCalled = false;

export async function initObservability() {
  if (_initCalled) return;
  _initCalled = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // disabled unless DSN present
  try {
    const Sentry: any = await import('@sentry/node'); // eslint-disable-line @typescript-eslint/no-explicit-any
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT,
    });
    _sentry = Sentry;
  } catch {
    // If package not installed or fails, keep disabled silently.
    _sentry = null;
  }
}

export function observabilityEnabled() {
  return Boolean(_sentry);
}

export async function withObservabilityScope<T>(ctx: Record<string, unknown>, run: () => Promise<T> | T) {
  if (!_sentry) return await run();
  return await _sentry.withScope(async (scope: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Light tagging
    if (ctx.reqId) scope.setTag('req.id', String(ctx.reqId));
    if (ctx.route) scope.setTag('route', String(ctx.route));
    if (ctx.userId) scope.setUser({ id: String(ctx.userId) });
    // Attach extras sparsely
    Object.entries(ctx).forEach(([k, v]) => {
      if (v == null) return;
      if (['reqId','route','userId'].includes(k)) return;
      try { scope.setExtra(k, v as any); } catch {/* ignore */} // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    return await run();
  });
}

export async function runInSpan<T>(name: string, data: Record<string, unknown>, run: () => Promise<T> | T) {
  if (!_sentry || !_sentry.startSpan) return await run();
  return await _sentry.startSpan({ name, data }, async () => await run());
}

export function captureException(err: unknown, ctx?: Record<string, unknown>, scopeSetter?: ScopeSetter) {
  if (!_sentry) return;
  try {
    _sentry.captureException(err, (scope: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (ctx?.reqId) scope.setTag('req.id', String(ctx.reqId));
      if (ctx?.route) scope.setTag('route', String(ctx.route));
      if (ctx?.userId) scope.setUser({ id: String(ctx.userId) });
      if (ctx) Object.entries(ctx).forEach(([k,v]) => {
        if (v == null) return;
        if (['reqId','route','userId'].includes(k)) return;
        try { scope.setExtra(k, v as any); } catch {/* ignore */} // eslint-disable-line @typescript-eslint/no-explicit-any
      });
      if (scopeSetter) scopeSetter(scope);
    });
  } catch { /* ignore */ }
}

export function getObservabilityStatus() {
  return { sentryEnabled: observabilityEnabled() };
}
