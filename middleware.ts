import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Lightweight request ID generator (avoids pulling crypto for speed)
function rid(){return Math.random().toString(36).slice(2,10);} 

const PROTECTED_PREFIXES = ['/trades', '/api/trades'];

export async function middleware(req: NextRequest) {
  const reqId = rid();
  // Propagate request id via header for server/client correlation
  const resHeaders = new Headers();
  resHeaders.set('x-request-id', reqId);
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
  matcher: ['/trades/:path*', '/api/trades/:path*']
};
