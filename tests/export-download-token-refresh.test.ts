import { beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Enable feature flag before importing route
process.env.ENABLE_EXPORTS = '1';

// Mock next-auth BEFORE route imports
vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: (globalThis as any).__TEST_USER_ID, email: 'refresh@example.com' } }) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

// Only need the token refresh handler for this focused test
import { POST as TOKEN_REFRESH } from '@/app/api/exports/jobs/[id]/token/route';

declare global { var __TEST_USER_ID: string | undefined }

function makeReq(url: string, init?: RequestInit){
  return new Request(url, { headers: { 'content-type':'application/json' }, ...init });
}

describe('export token refresh', () => {
  let userId: string;
  let jobId: string;
  let originalToken: string;
  beforeAll(async () => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const user = await prisma.user.create({ data: { email: `tokenrefresh-${unique}@example.com`, passwordHash: 'x' } });
    userId = user.id;
    (globalThis as any).__TEST_USER_ID = userId; // eslint-disable-line @typescript-eslint/no-explicit-any
    await prisma.journalSettings.create({ data: { userId } }).catch(()=>{});
    // Insert a completed export job directly (bypass worker & build)
    const pastExpiry = new Date(Date.now() - 5_000);
    const job = await prisma.exportJob.create({
      data: {
        userId,
        type: 'trades',
        format: 'csv',
        paramsJson: {},
        status: 'completed',
        filename: 'trades.csv',
        contentType: 'text/csv',
        payloadBase64: Buffer.from('id,example\n').toString('base64'),
        downloadTokenExpiresAt: pastExpiry,
        downloadTokenConsumedAt: null
      }
    });
    jobId = job.id;
    const secret = process.env.EXPORT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret';
    originalToken = crypto.createHmac('sha256', secret).update(job.id + '|' + pastExpiry.getTime()).digest('hex').slice(0,32);
  });

  it('refreshes token after expiry for completed job', async () => {
    const res = await (TOKEN_REFRESH as unknown as (req: Request, ctx: { params: { id: string } }) => Promise<Response>)(makeReq(`http://localhost/api/exports/jobs/${jobId}/token`, { method: 'POST' }), { params: { id: jobId } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.downloadToken).not.toBe(originalToken);
    expect(typeof json.data.tokenExpiresAt).toBe('number');
    expect(json.data.tokenExpiresAt).toBeGreaterThan(Date.now());
  });
});