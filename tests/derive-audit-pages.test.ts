import { describe, it, expect } from 'vitest';
// @ts-expect-error - Import .mjs file in TypeScript test
import { computeDerivedPages } from '../scripts/derive-audit-pages-core.mjs';

const map = {
  groups: {
    tokens: ['app/globals.css'],
    ui: ['components/ui'],
    pages_dashboard: ['app/dashboard'],
    pages_trades: ['app/trades']
  },
  pageDependencies: {
    '/': ['tokens','ui'],
    '/dashboard': ['tokens','ui','pages_dashboard'],
    '/trades': ['tokens','ui','pages_trades']
  }
};

const pagesCfg = ['/', '/dashboard', '/trades'];

describe('computeDerivedPages', () => {
  it('returns all pages when broad token change', () => {
    const res = computeDerivedPages({ changedFiles: ['app/globals.css'], map, pagesCfg });
    expect(res.sort()).toEqual(pagesCfg.sort());
  });
  it('returns specific page when only dashboard files change', () => {
    const res = computeDerivedPages({ changedFiles: ['app/dashboard/page.tsx'], map, pagesCfg });
    expect(res).toContain('/dashboard');
    expect(res).not.toContain('/trades');
  });
  it('falls back to root when no matches', () => {
    const res = computeDerivedPages({ changedFiles: ['README.md'], map, pagesCfg });
    expect(res).toEqual(['/']);
  });
});
