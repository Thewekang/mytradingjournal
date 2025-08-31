import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PROTECTED_PREFIXES = ['/trades', '/api/trades'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
  const token = await getToken({ req });
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }), { status: 401 });
    }
    const login = new URL('/', req.url); // redirect to home where sign in button exists
    login.searchParams.set('redirect', pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/trades/:path*', '/api/trades/:path*']
};
