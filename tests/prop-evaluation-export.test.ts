import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { upsertPropEvaluation } from '@/lib/services/prop-evaluation-service';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';

process.env.ENABLE_EXPORTS = '1';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'prop-export@test.local' } })
}));

import { POST as JOB_POST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DETAIL } from '@/app/api/exports/jobs/[id]/route';
import { GET as JOB_DOWNLOAD } from '@/app/api/exports/jobs/[id]/download/route';

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string) {
  const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
  const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return json?.data;
}

describe('prop evaluation export bundle', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `prop-export-${Date.now()}@ex.com`, passwordHash: 'x' } });
    (globalThis as any).__TEST_USER_ID = user.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.journalSettings.create({ data: { userId: user.id, initialEquity: 50000 } });
    // Seed a basic ACTIVE evaluation so export has content
    // Minimal fields; service will compute progress even with no trades yet
    await upsertPropEvaluation(user.id, {
      firmName: 'FirmZ',
      phase: 'PHASE1',
      accountSize: 50000,
      profitTarget: 3000,
      maxDailyLoss: 2500,
      maxOverallLoss: 5000,
      trailing: false,
      minTradingDays: 0,
      startDate: new Date()
    });
    await initExportTestSuite();
  });

  it('exports prop evaluation progress as JSON', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'propEvaluation', format: 'json' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await processJobNow(jobId);
    await waitForJob(jobId);
    const dl = await (JOB_DOWNLOAD as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${jobId}/download`), { params: { id: jobId } });
    expect(dl.status).toBe(200);
    const text = await dl.text();
    const rows = JSON.parse(text) as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row).toHaveProperty('active');
    expect(row).toHaveProperty('phase');
    expect(row).toHaveProperty('profitTarget');
  }, 8000);
});
