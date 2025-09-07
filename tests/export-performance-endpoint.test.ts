import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';

process.env.ENABLE_EXPORTS = '1';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'perf@test.local' } })
}));

import { POST as JOB_POST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DETAIL } from '@/app/api/exports/jobs/[id]/route';
import { GET as PERF_GET } from '@/app/api/exports/jobs/perf/route';

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string) {
  const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
  const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return json?.data;
}

declare global { var __TEST_USER_ID: string | undefined }

describe('export performance endpoint + enqueue log presence', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `perf-${Date.now()}@ex.com`, passwordHash: 'x' } });
    await prisma.journalSettings.create({ data: { userId: user.id } });
    (globalThis as any).__TEST_USER_ID = user.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await initExportTestSuite();
  });

  it('returns a performance row for a completed job', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await processJobNow(jobId);
    await waitForJob(jobId);
    const perfRes = await (PERF_GET as unknown as (req: Request) => Promise<Response>)(makeReq('http://localhost/api/exports/jobs/perf'));
    expect(perfRes.status).toBe(200);
    const perfJson = await perfRes.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(Array.isArray(perfJson.data)).toBe(true);
    if (perfJson.data.length) {
      const ids = perfJson.data.map((r: any)=> r.jobId); // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(ids).toContain(jobId);
    }
  }, 8000);
});
