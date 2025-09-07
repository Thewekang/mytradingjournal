#!/usr/bin/env node
/**
 * Basic axe-core accessibility scan using Playwright.
 * Visits configured pages and runs axe-core; aggregates violations.
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.axe');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
let pagesConfig = ['/','/dashboard','/trades','/goals','/settings'];
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT,'scripts','audit-pages.json'),'utf8'));
  if (Array.isArray(cfg.pages)) pagesConfig = cfg.pages;
} catch { /* default */ }
const PAGES = (process.env.AUDIT_PAGES ? process.env.AUDIT_PAGES.split(',') : pagesConfig);

const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];
  for (const pagePath of PAGES) {
    for (const theme of ['dark','light']) {
    const page = await context.newPage();
    const url = `${BASE_URL}${pagePath}`;
    console.log('Axe: scanning', url, '(theme:', theme, ')');
    // Try a fast load first; networkidle on some pages (with streaming / open SSE) can hang until timeout.
    // We'll navigate normally then wait for a brief network quiet period manually.
    const navStart = Date.now();
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    } catch (e) {
      console.warn('Navigation warning (continuing):', e.message);
    }
    // Wait for network to be relatively idle (no requests for 500ms) up to 5s.
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {/* tolerate */}
    // Force theme attribute (client script sets it normally on user toggle)
    await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); }, theme).catch(()=>{});
    const navDur = Date.now() - navStart;
    if (navDur > 25000) console.warn('Slow navigation (>25s) may reduce audit stability:', url);
    // Wait for body text color & background to differ from initial defaults (indicates CSS variables applied)
    await page.waitForFunction(() => {
      const cs = getComputedStyle(document.body);
      // Detect that CSS variables have applied by presence of a custom property value resolution
      // (when tokens applied, computed color usually differs from initial canvas default and background becomes non-empty)
      const color = cs.color;
      const bg = cs.backgroundColor;
      return !!color && !!bg && color !== bg;
    }, { timeout: 5000 }).catch(()=>{}); // non-fatal if times out
    // Wait for metadata (title + lang) to be present to avoid false positives from streaming head
    try {
      await page.waitForFunction(() => !!document.title && !!document.documentElement.getAttribute('lang'), { timeout: 5000 });
    } catch { /* proceed anyway */ }
    await page.addScriptTag({ content: AXE_SRC });
    const axeResult = await page.evaluate(async () => {
      // @ts-expect-error injected by addScriptTag
      const axeRef = window.axe || (globalThis).axe;
      if (!axeRef) throw new Error('axe-core not injected');
      return await axeRef.run({ runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] } });
    });
    // Provide richer detail for color-contrast to help debugging
    const simplified = {
      page: pagePath + (theme === 'light' ? '#light' : ''),
      violations: axeResult.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        samples: v.id === 'color-contrast'
          ? v.nodes.slice(0,5).map(n => ({
              target: n.target?.[0] || '',
              html: (n.html||'').slice(0,120),
              // Attempt to surface contrast info if present in any/all
              info: [...(n.any||[]),...(n.all||[])].filter(r=>r.id==='color-contrast').map(r=>r.message).slice(0,1)[0] || ''
            }))
          : undefined
      }))
    };
    results.push(simplified);
    if (simplified.violations.length) {
      console.warn('Violations:', simplified.violations.map(v=>`${v.id}(${v.impact})`).join(', '));
      const contrast = simplified.violations.find(v=>v.id==='color-contrast');
      if (contrast && contrast.samples) {
        contrast.samples.forEach(s => console.warn('  contrast sample:', s.target, s.info));
      }
    }
  await page.close();
  }
  }
  await browser.close();
  const summary = { results, generatedAt: new Date().toISOString() };
  const summaryPath = path.join(OUT_DIR,'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Diff-based gating: track serious/critical violations per (page,id) pair.
  const currentSevere = results.flatMap(r => r.violations
    .filter(v => ['critical','serious'].includes(v.impact || ''))
    .map(v => ({ page: r.page, id: v.id }))
  );
  const baselinePath = path.join(OUT_DIR, 'baseline.json');
  if (process.env.AXE_UPDATE_BASELINE === '1') {
    fs.writeFileSync(baselinePath, JSON.stringify({ severe: currentSevere, updatedAt: new Date().toISOString() }, null, 2));
    console.log('Axe baseline updated.');
    process.exit(0);
  }
  let baseline = { severe: [] };
  if (fs.existsSync(baselinePath)) {
    try { baseline = JSON.parse(fs.readFileSync(baselinePath,'utf8')); } catch { /* ignore */ }
  } else {
    // Auto-create baseline on first run to enable future diff gating.
    fs.writeFileSync(baselinePath, JSON.stringify({ severe: currentSevere, createdAt: new Date().toISOString() }, null, 2));
    console.log('Axe baseline created (no gating this run).');
    process.exit(0);
  }
  // Determine new severe violations not previously recorded.
  const baselineSet = new Set(baseline.severe.map(v => `${v.page}::${v.id}`));
  const newSevere = currentSevere.filter(v => !baselineSet.has(`${v.page}::${v.id}`));
  if (newSevere.length) {
    console.error('New serious/critical accessibility violations detected since baseline:');
    newSevere.forEach(v => console.error(` - ${v.page} ${v.id}`));
    console.error('Run with AXE_UPDATE_BASELINE=1 after fixing (or to intentionally accept) to update baseline.');
    process.exit(1);
  }
  console.log('Accessibility audit passed (no new serious/critical issues).');
}

run();
