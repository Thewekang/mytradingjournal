import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Revert to minimal supported export (previously build-stable). Add a defensive
// runtime guard that short-circuits if NextAuth's internal catch-all context is
// unexpectedly missing, returning 400 instead of throwing.
const handler = NextAuth(authOptions);

async function safe(req: Request, ctx: unknown) {
	// If ctx missing expected shape, return a 400 to avoid noisy stack traces.
	// (No explicit typing to prevent Next.js route type inference mismatch.)
		// @ts-expect-error dynamic route context shape not inferred here
	if (!ctx || !ctx.params || !Array.isArray(ctx.params.nextauth)) {
		return new Response(JSON.stringify({ data: null, error: { code: 'BAD_REQUEST', message: 'Missing auth action segment' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}
	return handler(req, ctx);
}

export { safe as GET, safe as POST };
