import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { computeEvaluationProgress } from '@/lib/services/prop-evaluation-service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const progress = await computeEvaluationProgress(session.user.id);
    if (!progress) return Response.json({ data: { active: false, alerts: [] } });
    return Response.json({ data: { active: true, ...progress } });
  } catch {
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}
