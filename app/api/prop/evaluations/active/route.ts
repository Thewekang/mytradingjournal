import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getActiveEvaluation } from '@/lib/services/prop-evaluation-service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
    const evaln = await getActiveEvaluation(session.user.id);
    if (!evaln) return Response.json({ data: null });
    return Response.json({ data: evaln });
  } catch {
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}
