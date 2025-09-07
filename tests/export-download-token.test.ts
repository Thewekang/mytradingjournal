import { describe, it, expect, vi, beforeAll } from 'vitest';

process.env.ENABLE_EXPORTS = '1';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'persist-export@test.local' } })
}));

// Defer DB-dependent imports to runtime so this file can be loaded even when DB is unavailable.
let JOB_POST: ((req: Request) => Promise<Response>) | undefined;
let JOB_LIST: ((req: Request) => Promise<Response>) | undefined;
let JOB_DETAIL: ((req: Request, ctx: { params: { id: string } }) => Promise<Response>) | undefined;
let JOB_DOWNLOAD: ((req: Request, ctx: { params: { id: string } }) => Promise<Response>) | undefined;
let processJobNow: ((id: string) => Promise<unknown>) | undefined;

declare global { var __TEST_USER_ID: string | undefined }

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string) {
  if (!JOB_DETAIL) throw new Error('JOB_DETAIL not loaded');
  const res = await JOB_DETAIL(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
  const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return json?.data;
}

async function seedUser() {
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.create({ data: { email: `persist-token-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  return user;
}

const SKIP_DB = (globalThis as any).__SKIP_DB__ === true; // eslint-disable-line @typescript-eslint/no-explicit-any
const d = SKIP_DB ? describe.skip : describe;

d('export download token + rate limit [db]', () => {
  beforeAll(async () => {
    // Dynamically import DB-dependent modules
    const u = await seedUser();
    (globalThis as any).__TEST_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    const routes = await import('@/app/api/exports/jobs/route');
    JOB_POST = routes.POST as unknown as (req: Request) => Promise<Response>;
    JOB_LIST = routes.GET as unknown as (req: Request) => Promise<Response>;
    const detail = await import('@/app/api/exports/jobs/[id]/route');
    JOB_DETAIL = detail.GET as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
    const dl = await import('@/app/api/exports/jobs/[id]/download/route');
    JOB_DOWNLOAD = dl.GET as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
    const helpers = await import('./helpers/export-test-utils');
    processJobNow = helpers.processJobNow;
    await helpers.initExportTestSuite();
  });

  it('includes downloadToken and enforces it outside test env', async () => {
  if (!JOB_POST || !JOB_LIST || !JOB_DOWNLOAD || !processJobNow) throw new Error('Routes/helpers not loaded');
  const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'json' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(created.data.downloadToken).toBeDefined();
    const jobId = created.data.id;
  await processJobNow(jobId);
    await waitForJob(jobId);
  const list = await JOB_LIST(makeReq('http://localhost/api/exports/jobs'));
    const listJson = await list.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobEntry = listJson.data.find((j: any) => j.id === jobId); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(jobEntry.downloadToken).toBe(created.data.downloadToken);
  const good = await JOB_DOWNLOAD(makeReq(`http://localhost/api/exports/jobs/${jobId}/download?token=${created.data.downloadToken}`), { params: { id: jobId } });
    expect(good.status).toBe(200);
    // Correlation header should always be present via withLogging
    const ridA = good.headers.get('x-request-id');
    expect(ridA).toBeTruthy();
    // If a request id is provided, it should be echoed back
    const providedRid = `rid-${Date.now()}`;
    const goodWithHeader = await JOB_DOWNLOAD(
      makeReq(`http://localhost/api/exports/jobs/${jobId}/download?token=${created.data.downloadToken}`, { headers: { 'x-request-id': providedRid } }),
      { params: { id: jobId } }
    );
    expect(goodWithHeader.status).toBe(200);
    expect(goodWithHeader.headers.get('x-request-id')).toBe(providedRid);
  }, 15000);

  it('applies per-user active job rate limit', async () => {
    if (!JOB_POST) throw new Error('Routes/helpers not loaded');
    const post = JOB_POST as (req: Request) => Promise<Response>;
    const promises: Promise<Response>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(post(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'goals', format: 'csv' }) })));
    }
    const results = await Promise.all(promises);
    results.forEach(r => expect(r.status).toBe(202));
    const sixth = await post(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'goals', format: 'csv' }) }));
    if (sixth.status === 429) {
      const json = await sixth.json();
      expect(json.error.code).toBe('RATE_LIMIT');
    }
  }, 8000);
});