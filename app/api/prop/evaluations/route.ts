import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { upsertPropEvaluation } from '@/lib/services/prop-evaluation-service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
  const required = ['firmName','accountSize','profitTarget','maxDailyLoss','maxOverallLoss','startDate'];
    for (const k of required) { if (!(k in body)) return Response.json({ error: `missing_${k}` }, { status: 400 }); }
    const evaln = await upsertPropEvaluation(session.user.id, {
      firmName: String(body.firmName),
      accountSize: Number(body.accountSize),
      profitTarget: Number(body.profitTarget),
      maxDailyLoss: Number(body.maxDailyLoss),
      maxOverallLoss: Number(body.maxOverallLoss),
      maxSingleTradeRisk: body.maxSingleTradeRisk != null ? Number(body.maxSingleTradeRisk) : undefined,
      trailing: Boolean(body.trailing),
      minTradingDays: body.minTradingDays != null ? Number(body.minTradingDays) : undefined,
      consistencyBand: body.consistencyBand != null ? Number(body.consistencyBand) : undefined,
      startDate: new Date(body.startDate)
    });
    return Response.json({ data: evaln });
  } catch {
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}
