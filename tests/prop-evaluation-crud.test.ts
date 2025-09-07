import { describe, it, expect, vi, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: (globalThis as any).__TEST_PROP_CRUD_USER_ID, email: 'prop-crud@test.local' } }) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

import { POST as CREATE } from '@/app/api/prop/evaluations/route';
import { GET as ACTIVE } from '@/app/api/prop/evaluations/active/route';

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

declare global { var __TEST_PROP_CRUD_USER_ID: string | undefined }

async function seedUser() {
  const user = await prisma.user.create({ data: { email: `prop-crud-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  return user;
}

describe('prop evaluation CRUD API', () => {
  beforeAll(async () => {
    const u = await seedUser();
    (globalThis as any).__TEST_PROP_CRUD_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('creates and retrieves active evaluation', async () => {
    const body = { firmName: 'FirmX', accountSize: 100000, profitTarget: 8000, maxDailyLoss: 4000, maxOverallLoss: 8000, startDate: new Date().toISOString() };
    const res = await (CREATE as unknown as (req: Request) => Promise<Response>)(makeReq('http://localhost/api/prop/evaluations', { method: 'POST', body: JSON.stringify(body) }));
    expect(res.status).toBe(200);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(created.data.firmName).toBe('FirmX');
    const active = await (ACTIVE as unknown as () => Promise<Response>)();
    const activeJson = await active.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(activeJson.data.id).toBe(created.data.id);
    expect(activeJson.data.status).toBe('ACTIVE');
  });
});
