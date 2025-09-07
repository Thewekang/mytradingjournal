import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';
import { POST as JOB_POST } from '@/app/api/exports/jobs/route';

process.env.ENABLE_EXPORTS = '1';

// We monkey patch logger.info to capture enqueue log lines referencing requestId.
interface CapturedLog { obj: Record<string, unknown>; msg?: string }
vi.mock('@/lib/logger', async (orig) => {
  const actual = await (orig() as unknown as Promise<{ logger: { info: (o: Record<string, unknown>, m?: string) => void } }>);
  const captured: CapturedLog[] = [];
  const patched = {
    ...actual,
    logger: {
      ...actual.logger,
      info: (obj: Record<string, unknown>, msg?: string) => {
        captured.push({ obj, msg });
        return actual.logger.info(obj, msg);
      },
    },
    __captured: captured as CapturedLog[],
  } as const;
  return patched;
});

// next-auth mock
vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'log@test.local' } })
}));

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string) {
  const { GET: JOB_DETAIL } = await import('@/app/api/exports/jobs/[id]/route');
  const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
  const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return json?.data;
}

declare global { var __TEST_USER_ID: string | undefined }

describe('export enqueue log includes requestId', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `log-${Date.now()}@ex.com`, passwordHash: 'x' } });
    await prisma.journalSettings.create({ data: { userId: user.id } });
    (globalThis as any).__TEST_USER_ID = user.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await initExportTestSuite();
  });

  it('emits export.job.enqueued with requestId field', async () => {
    const rid = `l-${Date.now()}`;
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'trades', format: 'csv' }), headers: { 'x-request-id': rid } }));
    expect(res.status).toBe(202);
    const created = await res.json() as { data: { id: string } };
    const jobId = created.data.id;
    await processJobNow(jobId);
    await waitForJob(jobId);
    const mod = await import('@/lib/logger') as unknown as { __captured: CapturedLog[] };
    const enqueue = mod.__captured.find(c => c.msg === 'export.job.enqueued' && c.obj?.jobId === jobId);
    expect(enqueue?.obj?.requestId).toBe(rid);
  }, 8000);
});
