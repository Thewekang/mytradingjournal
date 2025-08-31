import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session.user as { email: string; name?: string | null; id?: string };
}
