#!/usr/bin/env node
/**
 * Reduced Motion Audit
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
let pagesConfig = ['/','/dashboard','/trades','/goals','/settings'];
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','audit-pages.json'),'utf8'));
  if (Array.isArray(cfg.pages)) pagesConfig = cfg.pages;
} catch { /* ignore */ }
const PAGES = (process.env.AUDIT_PAGES ? process.env.AUDIT_PAGES.split(',') : pagesConfig);
const OUT_DIR = path.join(ROOT,'.motion');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR,{recursive:true});
const allowlistPath = path.join(OUT_DIR,'allowlist.json');
let allowlist = [];
if (fs.existsSync(allowlistPath)) {
  try { allowlist = JSON.parse(fs.readFileSync(allowlistPath,'utf8')); } catch { allowlist = []; }
}

(async () => {
  const errors = [];
  console.log('[motion] base', BASE_URL, 'pages', PAGES.join(', '));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const offending = [];
    for (const path of PAGES) {
      console.log('[motion] scanning', path);
      try {
        const page = await context.newPage();
        await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const results = await page.evaluate(() => {
          const arr = [];
          document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (!cs.transitionDuration || cs.transitionDuration === '0s') return;
            const durations = cs.transitionDuration.split(',').map(d=>parseFloat(d)*1000).filter(n=>!isNaN(n));
            if (!durations.length) return;
            const max = Math.max(...durations);
            if (max > 20) {
              arr.push({ tag: el.tagName, cls: el.className, prop: cs.transitionProperty, dur: max });
            }
          });
          return arr;
        });
        for (const r of results) if (/(opacity|transform|left|right|top|bottom|color)/.test(r.prop)) offending.push({ page: path, ...r });
        await page.close();
      } catch (e) {
        console.error('[motion] error scanning', path, e.message);
        errors.push({ page: path, error: e.message });
      }
    }
    // Filter out allowlisted entries (match by page + class substring + property)
    const filtered = offending.filter(o => !allowlist.some(a => o.page===a.page && o.cls.includes(a.classContains || '') && o.prop.includes(a.prop || '')));
    const summary = { generatedAt: new Date().toISOString(), violations: filtered, total: filtered.length, errors };
    fs.writeFileSync(path.join(OUT_DIR,'latest.json'), JSON.stringify(summary,null,2));
    if (process.env.MOTION_UPDATE_ALLOWLIST === '1') {
      const merged = [...allowlist];
      for (const v of filtered) {
        merged.push({ page: v.page, classContains: v.cls.split(' ')[0] || v.cls, prop: v.prop });
      }
      fs.writeFileSync(allowlistPath, JSON.stringify(merged,null,2));
      console.log('Motion allowlist updated.');
      process.exit(0);
    }
    if (errors.length) {
      console.error('Motion audit encountered page errors. See latest.json');
      process.exit(1);
    }
    if (filtered.length) {
      console.error('Reduced motion violations (transitions >20ms under prefers-reduced-motion)');
      filtered.slice(0,50).forEach(o=>console.error(o));
      console.error('To allowlist current items (after confirming acceptable), rerun with MOTION_UPDATE_ALLOWLIST=1');
      process.exit(1);
    }
    console.log('Reduced motion audit passed.');
  } catch (outer) {
    console.error('[motion] fatal error', outer.message);
    try {
      fs.writeFileSync(path.join(OUT_DIR,'latest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), errors: [{ fatal: outer.message }] }, null, 2));
    } catch { /* ignore */ }
    process.exit(1);
  } finally {
    try { await browser?.close(); } catch { /* ignore */ }
  }
})();
