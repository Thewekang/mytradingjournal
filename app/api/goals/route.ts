import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createGoal, listGoals, goalCreateSchema } from '@/lib/services/goal-service';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  const goals = await listGoals(user.id!);
  return NextResponse.json({ data: goals });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: 'BAD_JSON', message: 'Invalid JSON'} }, { status: 400 }); }
  const parsed = goalCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  try {
  const goal = await createGoal(user.id!, parsed.data);
    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create goal' } }, { status: 500 });
  }
}
