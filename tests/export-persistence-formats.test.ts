import { describe, it, expect, vi, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ensureExportWorker } from '@/lib/services/export-job-service';

process.env.ENABLE_EXPORT_QUEUE = '1';
process.env.ENABLE_PERSIST_EXPORT = '1';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'persist-export@test.local' } })
}));

import { POST as JOB_POST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DETAIL } from '@/app/api/exports/jobs/[id]/route';
import { GET as JOB_DOWNLOAD } from '@/app/api/exports/jobs/[id]/download/route';

declare global { var __TEST_USER_ID: string | undefined }

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
    const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (json?.data?.status === 'completed') return json.data;
    if (json?.data?.status === 'failed') throw new Error('Job failed');
    await new Promise(r => setTimeout(r, 120));
  }
  throw new Error('Job timeout');
}

async function seedUser() {
  const user = await prisma.user.create({ data: { email: `persist-fmt-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  return user;
}

describe('persistent export multi-format', () => {
  beforeAll(async () => {
    const u = await seedUser();
    (globalThis as any).__TEST_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    ensureExportWorker();
  });

  it('exports trades as JSON', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'json' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await waitForJob(jobId);
    const dl = await (JOB_DOWNLOAD as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${jobId}/download`), { params: { id: jobId } });
    expect(dl.status).toBe(200);
    const text = await dl.text();
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('exports goals as XLSX (empty ok)', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'goals', format: 'xlsx' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    // Goals XLSX can occasionally take longer in CI; extend wait
    await waitForJob(jobId, 15000);
    const dl = await (JOB_DOWNLOAD as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${jobId}/download`), { params: { id: jobId } });
    expect(dl.status).toBe(200);
    // XLSX magic number: PK.. for zipped file
    const buf = Buffer.from(await dl.arrayBuffer());
    expect(buf.slice(0, 2).toString()).toBe('PK');
  }, 25000);
});
