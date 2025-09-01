import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { updateGoal, deleteGoal, goalUpdateSchema } from '@/lib/services/goal-service';
import { RouteContext } from '@/lib/api/params';
import { withLogging } from '@/lib/api/logger-wrapper';

async function _PATCH(req: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: { code: 'BAD_JSON', message: 'Invalid JSON'} }, { status: 400 }); }
  const parsed = goalUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  const updated = await updateGoal(user.id!, params.id, parsed.data);
  if (!updated) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
  return NextResponse.json({ data: updated });
}

async function _DELETE(_req: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  const ok = await deleteGoal(user.id!, params.id);
  if (!ok) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withLogging(_PATCH as any, 'PATCH /api/goals/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
export const DELETE = withLogging(_DELETE as any, 'DELETE /api/goals/[id]'); // eslint-disable-line @typescript-eslint/no-explicit-any
