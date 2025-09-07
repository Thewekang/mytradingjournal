import { withLogging, jsonOk, jsonError } from '@/lib/api/logger-wrapper';
import { authorizeCron } from '@/lib/cron/auth';
import { backupVerificationSummary } from '@/lib/services/backup-verify';

async function _GET(req: Request) {
  const auth = await authorizeCron(req);
  if (!auth.authorized) {
    return jsonError({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, 401);
  }
  try {
    const summary = await backupVerificationSummary();
    return jsonOk(summary, 200);
  } catch (e) {
    return jsonError({ code: 'INTERNAL', message: (e as Error).message || 'Internal error' }, 500);
  }
}

export const GET = withLogging(_GET, 'GET /api/cron/backup-verify');
