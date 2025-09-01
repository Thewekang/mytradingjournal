#!/usr/bin/env node
/**
 * Basic axe-core accessibility scan using Playwright.
 * Visits configured pages and runs axe-core; aggregates violations.
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.axe');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const PAGES = (process.env.AUDIT_PAGES || '/,/dashboard,/trades,/goals,/settings').split(',');

const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];
  for (const pagePath of PAGES) {
    const page = await context.newPage();
    const url = `${BASE_URL}${pagePath}`;
    console.log('Axe: scanning', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ content: AXE_SRC });
    const axeResult = await page.evaluate(async () => {
      // @ts-expect-error injected by addScriptTag
      const axeRef = window.axe || (globalThis).axe;
      if (!axeRef) throw new Error('axe-core not injected');
      return await axeRef.run({ runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] } });
    });
    const simplified = {
      page: pagePath,
      violations: axeResult.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length }))
    };
    results.push(simplified);
    if (simplified.violations.length) {
      console.warn('Violations:', simplified.violations.map(v=>`${v.id}(${v.impact})`).join(', '));
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR,'summary.json'), JSON.stringify({ results, generatedAt: new Date().toISOString() }, null, 2));
  const severe = results.flatMap(r => r.violations.filter(v => ['critical','serious'].includes(v.impact || '')));
  if (severe.length) {
    console.error('Accessibility audit failed: critical/serious issues present');
    process.exit(1);
  }
  console.log('Accessibility audit passed (no critical/serious issues).');
}

run();
