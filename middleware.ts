import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

declare global {
  // Persist simple token buckets across hot reloads in dev
  var __rateBucket: Map<string, { tokens: number; updatedAt: number }> | undefined;
}

// Lightweight request ID generator (avoids pulling crypto for speed)
function rid(){return Math.random().toString(36).slice(2,10);} 

const PROTECTED_PREFIXES = ['/trades', '/api/trades'];

export async function middleware(req: NextRequest) {
  const reqId = rid();
  // Propagate request id via header for server/client correlation
  const resHeaders = new Headers();
  resHeaders.set('x-request-id', reqId);
  // Basic rate limiting (env-gated). NOTE: in-memory only (single instance); use external store in production.
  if (process.env.ENABLE_RATE_LIMIT === '1' && req.nextUrl.pathname.startsWith('/api/')) {
    const ipHeader = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
    const key = `${ipHeader}`;
    const now = Date.now();
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || '60000');
    const limit = Number(process.env.RATE_LIMIT_MAX || '120');
    // token bucket per IP
  const bucketStore: Map<string, { tokens: number; updatedAt: number }> = globalThis.__rateBucket || new Map();
  globalThis.__rateBucket = bucketStore;
    let b = bucketStore.get(key);
    if (!b) { b = { tokens: limit, updatedAt: now }; bucketStore.set(key, b); }
    const elapsed = now - b.updatedAt;
    const refill = (elapsed / windowMs) * limit;
    b.tokens = Math.min(limit, b.tokens + refill);
    b.updatedAt = now;
    if (b.tokens < 1) {
      return new NextResponse(JSON.stringify({ data: null, error: { code: 'RATE_LIMITED', message: 'Too Many Requests' } }), {
        status: 429,
        headers: resHeaders,
      });
    }
    b.tokens -= 1;
  }
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next({ headers: resHeaders });
  }
  const token = await getToken({ req });
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }), { status: 401, headers: resHeaders });
    }
    const login = new URL('/', req.url); // redirect to home where sign in button exists
    login.searchParams.set('redirect', pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next({ headers: resHeaders });
}

export const config = {
  matcher: ['/trades/:path*', '/api/:path*']
};
