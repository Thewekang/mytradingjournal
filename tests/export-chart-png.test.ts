import { describe, it, expect, vi, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { processJobNow, initExportTestSuite } from './helpers/export-test-utils';

process.env.ENABLE_EXPORTS = '1';

vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'persist-export@test.local' } })
}));

import { POST as JOB_POST } from '@/app/api/exports/jobs/route';
import { GET as JOB_DOWNLOAD } from '@/app/api/exports/jobs/[id]/download/route';

declare global { var __TEST_USER_ID: string | undefined }
const isWindows = process.platform === 'win32';
const d = isWindows ? describe.skip : describe;

function makeReq(url: string, init?: RequestInit) { return new Request(url, init); }

async function seedUser() {
  const user = await prisma.user.create({ data: { email: `persist-chart-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  // Seed a couple of trades for equity movement
  const now = new Date();
  const sym = `SYM_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  await prisma.instrument.create({ data: { id: sym, symbol: sym, name: 'Symbol', category: 'Futures', currency: 'USD', tickSize: 0.25 } });
  await prisma.trade.create({ data: { userId: user.id, instrumentId: sym, direction: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 1, entryAt: new Date(now.getTime()-86400000), exitAt: new Date(now.getTime()-86300000), fees: 0, status: 'CLOSED' }});
  await prisma.trade.create({ data: { userId: user.id, instrumentId: sym, direction: 'SHORT', entryPrice: 110, exitPrice: 105, quantity: 1, entryAt: new Date(now.getTime()-43200000), exitAt: new Date(now.getTime()-43100000), fees: 0, status: 'CLOSED' }});
  return user;
}

d('chartEquity PNG export', () => {
  beforeAll(async () => {
    const u = await seedUser();
    (globalThis as any).__TEST_USER_ID = u.id; // eslint-disable-line @typescript-eslint/no-explicit-any
    await initExportTestSuite();
  });

  it('creates a PNG export for equity chart', async () => {
    const res = await JOB_POST(makeReq('http://localhost/api/exports/jobs', { method: 'POST', body: JSON.stringify({ type: 'chartEquity', format: 'png' }) }));
    expect(res.status).toBe(202);
    const created = await res.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobId = created.data.id;
    await processJobNow(jobId);
    const dl = await (JOB_DOWNLOAD as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${jobId}/download`), { params: { id: jobId } });
    expect(dl.status).toBe(200);
    const buf = Buffer.from(await dl.arrayBuffer());
    // PNG signature bytes: \x89PNG\r\n\x1a\n
    expect(buf.slice(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  }, 10000);
});
