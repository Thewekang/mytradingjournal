import { describe, it, expect, vi, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: (globalThis as any).__TEST_PROP_USER_ID, email: 'prop-api@test.local' } }) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

import { GET as PROGRESS } from '@/app/api/prop/evaluation/progress/route';
import { upsertPropEvaluation } from '@/lib/services/prop-evaluation-service';

declare global { var __TEST_PROP_USER_ID: string | undefined }
function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function seedUser() {
  const user = await prisma.user.create({ data: { email: `prop-api-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  return user;
}

describe('prop evaluation progress API', () => {
  beforeAll(async () => {
    const u = await seedUser();
    (globalThis as any).__TEST_PROP_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await upsertPropEvaluation(u.id, { firmName: 'MyProp', accountSize: 50000, profitTarget: 5000, maxDailyLoss: 2500, maxOverallLoss: 5000, startDate: new Date(Date.now() - 3*24*3600*1000) });
  });

  it('returns evaluation progress with active=true', async () => {
    const res = await (PROGRESS as unknown as (req: Request) => Promise<Response>)(makeReq('http://localhost/api/prop/evaluation/progress'));
    expect(res.status).toBe(200);
    const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(json.data.active).toBe(true);
    expect(json.data.profitTarget).toBe(5000);
    expect(Array.isArray(json.data.alerts)).toBe(true);
  });
});
