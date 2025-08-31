import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { updateGoal, deleteGoal, goalUpdateSchema } from '@/lib/services/goal-service';
import { RouteContext } from '@/lib/api/params';

export async function PATCH(req: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: { code: 'BAD_JSON', message: 'Invalid JSON'} }, { status: 400 }); }
  const parsed = goalUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  const updated = await updateGoal(user.id!, params.id, parsed.data);
  if (!updated) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext<{ id: string }>) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  const ok = await deleteGoal(user.id!, params.id);
  if (!ok) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
