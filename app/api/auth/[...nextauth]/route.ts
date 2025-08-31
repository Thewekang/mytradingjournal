import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';
const handler = NextAuth(authOptions); // only export handlers to satisfy validator
export { handler as GET, handler as POST };
