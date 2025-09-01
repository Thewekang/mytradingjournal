import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { withLogging } from '@/lib/api/logger-wrapper';

const baseHandler = NextAuth(authOptions);

// Adapter to match (req: Request) signature expected by withLogging
const GET = withLogging(async (req: Request) => baseHandler(req as any), 'AUTH GET'); // eslint-disable-line @typescript-eslint/no-explicit-any
const POST = withLogging(async (req: Request) => baseHandler(req as any), 'AUTH POST'); // eslint-disable-line @typescript-eslint/no-explicit-any

export { GET, POST };
