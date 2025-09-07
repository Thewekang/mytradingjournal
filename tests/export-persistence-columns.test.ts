import { describe, it, expect, vi, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { initExportTestSuite, processJobNow } from './helpers/export-test-utils';

process.env.ENABLE_EXPORTS = '1';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'persist-export-cols@test.local' } })
}));

import { POST as JOB_POST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DETAIL } from '@/app/api/exports/jobs/[id]/route';
import { GET as JOB_DOWNLOAD } from '@/app/api/exports/jobs/[id]/download/route';

declare global { var __TEST_USER_ID: string | undefined }

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function waitForJob(id: string) {
  const res = await (JOB_DETAIL as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${id}`), { params: { id } });
  const json = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return json?.data;
}

async function seedUserWithTrades() {
  const user = await prisma.user.create({ data: { email: `persist-cols-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const inst = await prisma.instrument.create({ data: { symbol: `PC${Date.now()}`, name: 'PC', category: 'Futures', currency: 'USD', tickSize: 0.25 } });
  // minimal trades
  await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 10, exitPrice: 15, quantity: 1, entryAt: new Date(), exitAt: new Date(), status: 'CLOSED', fees: 0 } });
  await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 20, exitPrice: 10, quantity: 2, entryAt: new Date(), exitAt: new Date(), status: 'CLOSED', fees: 0 } });
  return user;
}

describe('persistent export job queue (selectedColumns)', () => {
  beforeAll(async () => {
    const u = await seedUserWithTrades();
    (globalThis as any).__TEST_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await initExportTestSuite();
  });

  it('respects selectedColumns subset for trades CSV job', async () => {
    const body = { type: 'trades', format: 'csv', params: { selectedColumns: ['id','direction','__invalid__'] } };
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify(body) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await processJobNow(jobId);
    await waitForJob(jobId);
    const dl = await (JOB_DOWNLOAD as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${jobId}/download`), { params: { id: jobId } });
    expect(dl.status).toBe(200);
    const text = await dl.text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('id,direction'); // invalid column filtered out, only requested valid subset
    for (const line of lines.slice(1)) {
      // ensure only two columns in each data row (stream footer may appear starting with '#')
      if (line.startsWith('#')) continue;
      expect(line.split(',').length).toBe(2);
    }
  }, 10000);
});
