import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import type { Session } from 'next-auth';
import type { SessionUser } from '@/types/auth';

export function isSessionUser(u: unknown): u is SessionUser {
  if (!u || typeof u !== 'object') return false;
  const r = u as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.email === 'string';
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session: Session | null = await getServerSession(authOptions);
  if (session?.user && isSessionUser(session.user)) return session.user;
  return null;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error('UNAUTHORIZED');
  return u;
}
