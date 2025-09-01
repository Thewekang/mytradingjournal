import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createGoal, listGoals, goalCreateSchema } from '@/lib/services/goal-service';
import { ResponseEnvelope, GoalDTO, ApiError } from '@/types/api';
import { withLogging } from '@/lib/api/logger-wrapper';

async function _GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json<ResponseEnvelope<GoalDTO[]>>({ data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  const goals = await listGoals(user.id!);
  type GoalEntity = typeof goals[number];
  const dto: GoalDTO[] = goals.map((g: GoalEntity): GoalDTO => ({
    id: g.id,
    type: g.type,
    period: g.period,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    startDate: g.startDate.toISOString(),
    endDate: g.endDate.toISOString(),
    achievedAt: g.achievedAt ? g.achievedAt.toISOString() : null,
    windowDays: g.windowDays ?? null,
  }));
  return NextResponse.json<ResponseEnvelope<GoalDTO[]>>({ data: dto, error: null }, { status: 200 });
}

async function _POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json<ResponseEnvelope<GoalDTO>>({ data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json<ResponseEnvelope<GoalDTO>>({ data: null, error: { code: 'BAD_JSON', message: 'Invalid JSON' } }, { status: 400 }); }
  const parsed = goalCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json<ResponseEnvelope<GoalDTO>>({ data: null, error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  try {
    const goal = await createGoal(user.id!, parsed.data);
    const dto: GoalDTO = {
      id: goal.id,
      type: goal.type,
      period: goal.period,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      startDate: goal.startDate.toISOString(),
      endDate: goal.endDate.toISOString(),
      achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
      windowDays: goal.windowDays ?? null,
    };
    return NextResponse.json<ResponseEnvelope<GoalDTO>>({ data: dto, error: null }, { status: 201 });
  } catch {
    const err: ApiError = { code: 'INTERNAL', message: 'Failed to create goal' };
    return NextResponse.json<ResponseEnvelope<GoalDTO>>({ data: null, error: err }, { status: 500 });
  }
}

export const GET = withLogging(_GET, 'GET /api/goals');
export const POST = withLogging(_POST, 'POST /api/goals');
