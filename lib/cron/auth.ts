import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export interface CronAuthResult { authorized: boolean; reason?: string }

// Authorization for internal cron endpoints: either an admin session OR a shared secret header.
// Header: x-cron-secret: <secret>
export async function authorizeCron(req: Request): Promise<CronAuthResult> {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret') || req.headers.get('X-CRON-SECRET');
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return { authorized: true };
  }
  // Fallback to session admin
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id && session.user.role === 'ADMIN') {
      return { authorized: true };
    }
    return { authorized: false, reason: 'unauthorized' };
  } catch {
    return { authorized: false, reason: 'auth_error' };
  }
}
