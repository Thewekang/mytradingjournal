import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';

process.env.ENABLE_EXPORTS = '1';

// mock next-auth
vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'reqid@test.local' } })
}));

import { POST as JOB_POST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DETAIL } from '@/app/api/exports/jobs/[id]/route';

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
    const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (json?.data?.status === 'completed' || json?.data?.status === 'failed') return json.data;
    await new Promise(r => setTimeout(r, 120));
  }
  throw new Error('timeout');
}

declare global { var __TEST_USER_ID: string | undefined }

describe('export job request id propagation', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `reqid-${Date.now()}@ex.com`, passwordHash: 'x' } });
    await prisma.journalSettings.create({ data: { userId: user.id } });
    ;(globalThis as any).__TEST_USER_ID = user.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await initExportTestSuite();
  });

  it('persists requestId when header present', async () => {
    const rid = `t-${Date.now()}`;
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }), headers: { 'x-request-id': rid } }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
  // Deterministic immediate processing to avoid reliance on worker timing
    await processJobNow(jobId).catch(()=>{});
    await waitForJob(jobId);
    const row = await prisma.exportJob.findUnique({ where: { id: jobId } });
    expect(row?.requestId).toBe(rid);
  }, 12000);

  it('filters list by requestId', async () => {
    const ridA = `f-${Date.now()}`;
    const ridB = `g-${Date.now()}`;
    const a = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }), headers: { 'x-request-id': ridA } }));
    const b = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }), headers: { 'x-request-id': ridB } }));
    const jobA = (await a.json() as any).data.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobB = (await b.json() as any).data.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await Promise.all([
      processJobNow(jobA).catch(()=>{}),
      processJobNow(jobB).catch(()=>{})
    ]);
    await waitForJob(jobA);
    await waitForJob(jobB);
    const listFiltered = await fetch(`http://localhost/api/exports/jobs?requestId=${encodeURIComponent(ridA)}`).catch(()=>null);
    // Fallback to direct route invocation if global fetch not available in test env
    let json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if(!listFiltered) {
      const { GET: LIST } = await import('@/app/api/exports/jobs/route');
      const res = await (LIST as unknown as (req: Request) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs?requestId=${encodeURIComponent(ridA)}`));
      json = await res.json();
    } else {
      json = await listFiltered.json();
    }
    const ids = (json.data as Array<{id:string}>).map(r => r.id);
    expect(ids).toContain(jobA);
    if(ids.length > 1) {
      expect(ids).not.toContain(jobB);
    }
  }, 15000);
});
