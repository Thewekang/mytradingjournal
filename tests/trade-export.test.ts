import { describe, it, expect, vi, beforeAll } from 'vitest';

// augment global for test user id
declare global { var __TEST_USER_ID: string | undefined }
import { prisma } from '@/lib/prisma';

// Mock next-auth getServerSession BEFORE importing route handler
vi.mock('next-auth', async () => ({
  getServerSession: async () => ({ user: { id: globalThis.__TEST_USER_ID, email: 'trade-export@test.local' } })
}));

// After mock, import GET handler
import { GET } from '@/app/api/trades/export/route';

async function seed() {
  const user = await prisma.user.create({ data: { email: `export-${Date.now()}@ex.com`, passwordHash: 'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const inst = await prisma.instrument.create({ data: { symbol: `EX${Date.now()}${Math.random().toString(36).slice(2,6)}`, name: 'EX', category: 'Futures', currency: 'USD', tickSize: 0.25 } });
  // create two trades
  await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 1, entryAt: new Date(), exitAt: new Date(), status: 'CLOSED', fees: 0 } });
  await prisma.trade.create({ data: { userId: user.id, instrumentId: inst.id, direction: 'SHORT', entryPrice: 200, exitPrice: 190, quantity: 2, entryAt: new Date(), exitAt: new Date(), status: 'CLOSED', fees: 0 } });
  return user;
}

function makeReq(url: string) { return new Request(url); }

describe('trade export endpoint', () => {
  let baseUrl: string;
  beforeAll(async () => {
    const user = await seed();
  (globalThis as { __TEST_USER_ID?: string }).__TEST_USER_ID = user.id;
    baseUrl = 'http://localhost/api/trades/export';
  });

  it('exports selected columns in CSV', async () => {
    const url = `${baseUrl}?format=csv&col=id&col=direction`;
    const res = await GET(makeReq(url));
    const text = await res.text();
    expect(res.status).toBe(200);
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('id,direction');
    // ensure only two columns per line
    for (const line of lines.slice(1)) {
      expect(line.split(',').length).toBe(2);
    }
  });

  it('exports JSON structure', async () => {
    const url = `${baseUrl}?format=json&col=id&col=entryPrice`;
    const res = await GET(makeReq(url));
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body.columns).toEqual(['id','entryPrice']);
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBeGreaterThan(0);
    expect(Object.keys(body.rows[0])).toEqual(['id','entryPrice']);
  });

  it('exports XLSX binary', async () => {
    const url = `${baseUrl}?format=xlsx&col=id&col=quantity`;
    const res = await GET(makeReq(url));
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(100); // some minimal size
  });
});
