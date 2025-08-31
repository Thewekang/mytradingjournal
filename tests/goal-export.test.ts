import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__GOAL_USER_ID } })
}));

declare global { var __GOAL_USER_ID: string | undefined }

import { GET } from '@/app/api/goals/export/route';

async function seed() {
  const user = await prisma.user.create({ data: { email: `goalexp-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  // create a rolling window goal with windowDays
  await prisma.goal.create({ data: { userId: user.id, type: 'ROLLING_WINDOW_PNL', period: 'MONTH', targetValue: 500, currentValue: 123, startDate: new Date(), endDate: new Date(Date.now()+86400000*30), windowDays: 7 } });
  // create a total pnl goal
  await prisma.goal.create({ data: { userId: user.id, type: 'TOTAL_PNL', period: 'MONTH', targetValue: 1000, currentValue: 250, startDate: new Date(), endDate: new Date(Date.now()+86400000*30) } });
  return user;
}

function makeReq(url: string) { return new Request(url) as any; }

describe('goal export endpoint', () => {
  let baseUrl: string;
  beforeAll(async () => {
    const user = await seed();
    (globalThis as any).__GOAL_USER_ID = user.id;
    baseUrl = 'http://localhost/api/goals/export';
  });

  it('exports CSV with windowDays column', async () => {
    const res = await GET(makeReq(`${baseUrl}?format=csv&col=id&col=type&col=windowDays`));
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('id,type,windowDays');
    // ensure at least one line has 7 for rolling window goal
    expect(lines.slice(1).some(l => l.split(',')[2] === '7')).toBe(true);
  });

  it('exports JSON subset', async () => {
    const res = await GET(makeReq(`${baseUrl}?format=json&col=id&col=currentValue`));
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body.columns).toEqual(['id','currentValue']);
    expect(body.rows.length).toBe(2);
    expect(Object.keys(body.rows[0])).toEqual(['id','currentValue']);
  });
});