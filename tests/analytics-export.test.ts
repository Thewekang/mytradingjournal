import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';

// Mock session helper directly to avoid relying on next-auth internals
vi.mock('@/lib/session', () => ({
  getSessionUser: () => ({ id: (globalThis as { __AX_USER_ID?: string }).__AX_USER_ID || 'missing', email: 'user@example.com' }),
  requireSessionUser: () => ({ id: (globalThis as { __AX_USER_ID?: string }).__AX_USER_ID || 'missing', email: 'user@example.com' })
}));
declare global { var __AX_USER_ID: string | undefined }

import { GET as DailyExport } from '@/app/api/analytics/daily/export/route';
import { GET as TagExport } from '@/app/api/analytics/tag-performance/export/route';

async function seed(){
  const user = await prisma.user.create({ data: { email:`ax-${Date.now()}@ex.com`, passwordHash:'x' } });
  await prisma.journalSettings.create({ data: { userId: user.id } });
  const inst = await prisma.instrument.create({ data: { symbol:`AX${Date.now()}${Math.random().toString(36).slice(2,5)}`, name:'AX', category:'Futures', currency:'USD', tickSize:0.25 } });
  // Two tagged trades on different days
  const tag = await prisma.tradeTag.create({ data: { label:'Momentum', color:'#fff', userId: user.id } });
  await prisma.trade.create({ data: { userId:user.id, instrumentId:inst.id, direction:'LONG', entryPrice:100, exitPrice:110, quantity:1, entryAt:new Date(Date.now()-86400000*2), exitAt:new Date(Date.now()-86400000*2), status:'CLOSED', fees:0, tags:{ create:{ tagId: tag.id } } } });
  await prisma.trade.create({ data: { userId:user.id, instrumentId:inst.id, direction:'SHORT', entryPrice:200, exitPrice:190, quantity:1, entryAt:new Date(Date.now()-86400000), exitAt:new Date(Date.now()-86400000), status:'CLOSED', fees:0, tags:{ create:{ tagId: tag.id } } } });
  return user;
}

function req(url:string){ return new Request(url); }

describe('analytics export endpoints', () => {
  beforeAll(async ()=>{ const user = await seed(); (globalThis as { __AX_USER_ID?: string }).__AX_USER_ID = user.id; });

  it('daily PnL JSON export', async () => {
    const res = await DailyExport(req('http://localhost/api/analytics/daily/export?format=json&days=5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.columns).toEqual(['date','pnl']);
    expect(body.rows.length).toBeGreaterThan(0);
  });

  it('tag performance CSV export', async () => {
    const res = await TagExport(req('http://localhost/api/analytics/tag-performance/export?format=csv'));
    const text = await res.text();
    const header = text.split('\n')[0];
    expect(header).toBe('tagId,label,trades,wins,losses,winRate,sumPnl,avgPnl');
    expect(text.split('\n').length).toBeGreaterThan(1);
  });
});