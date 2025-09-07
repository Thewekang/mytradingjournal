import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { evaluateAndMaybeRollover } from '@/lib/services/prop-evaluation-service';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
    const result = await evaluateAndMaybeRollover(session.user.id);
    return Response.json({ data: result });
  } catch {
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}
