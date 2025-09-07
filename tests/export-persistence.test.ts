import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';

// Enable feature flags for persistent queue in test env
process.env.ENABLE_EXPORTS = '1';

// Mock next-auth
vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'persist-export@test.local' } })
}));

// Route handlers (import after mocks)
import { POST as JOB_POST, GET as JOB_LIST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DETAIL } from '@/app/api/exports/jobs/[id]/route';
import { GET as JOB_DOWNLOAD } from '@/app/api/exports/jobs/[id]/download/route';

async function seedUser() {
  const user = await prisma.user.create({ data: { email: `persist-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  return user;
}

declare global { var __TEST_USER_ID: string | undefined }

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string) {
  const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(
    makeReq(`http://localhost/api/exports/jobs/${id}`),
    { params: { id } }
  );
  const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return json?.data;
}

describe('persistent export job queue', () => {
  let userId: string;
  beforeAll(async () => {
    const u = await seedUser();
    (globalThis as any).__TEST_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    userId = u.id;
    await initExportTestSuite();
  });

  beforeEach(async () => {
    await prisma.exportJob.deleteMany({ where: { userId } });
  });

  it('creates a job and processes to completion', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await processJobNow(jobId);
    const final = await waitForJob(jobId);
    expect(final.status).toBe('completed');
    expect(final.filename).toBeDefined();
    const dl = await (JOB_DOWNLOAD as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(
      makeReq(`http://localhost/api/exports/jobs/${jobId}/download`),
      { params: { id: jobId } }
    );
    expect(dl.status).toBe(200);
    const text = await dl.text();
    expect(text.split('\n')[0]).toBe('id,instrumentId,direction,entryPrice,exitPrice,quantity,status,entryAt,exitAt');
  }, 10000);

  it('lists jobs including newly created one', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }) }));
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await processJobNow(jobId);
    await waitForJob(jobId);
    const listRes = await (JOB_LIST as unknown as (req: Request) => Promise<Response>)(makeReq('http://localhost/api/exports/jobs'));
    const listJson = await listRes.json() as { data: Array<{ id: string }> };
    const ids = listJson.data.map(j => j.id);
    expect(ids).toContain(jobId);
  }, 8000);
});
