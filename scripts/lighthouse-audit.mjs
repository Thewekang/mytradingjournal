#!/usr/bin/env node
/**
 * Lighthouse audit script.
 * Spins up Next build (if not already built) and runs Lighthouse on key routes.
 * Outputs JSON reports to ./.lighthouse and prints summarized scores.
 * Fails (exit 1) if scores drop below thresholds (configurable via env or defaults).
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.lighthouse');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const PAGES = (process.env.AUDIT_PAGES || '/,/dashboard,/trades,/goals,/settings').split(',');

const THRESHOLDS = {
  performance: Number(process.env.LH_MIN_PERF || 0.6),
  accessibility: Number(process.env.LH_MIN_A11Y || 0.9),
  'best-practices': Number(process.env.LH_MIN_BP || 0.9),
  seo: Number(process.env.LH_MIN_SEO || 0.8)
};

function run(cmd, args, opts={}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'pipe', shell: process.platform === 'win32', ...opts });
    let out = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { out += d.toString(); });
    p.on('close', code => {
      if (code !== 0) return reject(new Error(out));
      resolve(out);
    });
  });
}

async function audit() {
  const results = [];
  for (const page of PAGES) {
    const target = `${BASE_URL}${page}`;
    const fileSafe = page === '/' ? 'home' : page.replace(/[^a-z0-9-_]/gi,'_');
  const outJson = path.join(OUT_DIR, `${fileSafe}.report.json`);
    console.log(`\nRunning Lighthouse for ${target}`);
    try {
  await run('npx', ['lighthouse', target, '--quiet', '--chrome-flags="--headless=new"', '--only-categories=performance,accessibility,best-practices,seo', `--output=json`, `--output=html`, `--output-path=${outJson}`]);
      // When specifying json+html with single output-path, lighthouse writes <path>.report.(json|html)
      const jsonPath = outJson.endsWith('.json') ? outJson : `${outJson}.report.json`;
  // html report path derived automatically (kept for reference if needed later)
      const report = JSON.parse(fs.readFileSync(jsonPath,'utf8'));
      const scores = {
        performance: report.categories.performance.score,
        accessibility: report.categories.accessibility.score,
        'best-practices': report.categories['best-practices'].score,
        seo: report.categories.seo.score
      };
      results.push({ page, scores });
      console.log('Scores:', Object.entries(scores).map(([k,v])=>`${k}=${(v*100).toFixed(0)}`).join(' '));
    } catch (e) {
      console.error('Lighthouse failed for', page, e.message);
      results.push({ page, error: e.message });
    }
  }
  let failed = false;
  for (const r of results) {
    if (r.error) { failed = true; continue; }
    for (const [k,v] of Object.entries(r.scores)) {
      const threshold = THRESHOLDS[k];
      if (v < threshold) {
        console.error(`Threshold fail: ${r.page} ${k} ${(v*100).toFixed(0)} < ${(threshold*100).toFixed(0)}`);
        failed = true;
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ results, thresholds: THRESHOLDS, generatedAt: new Date().toISOString() }, null, 2));
  if (failed) process.exit(1);
  console.log('\nAll Lighthouse thresholds met.');
}

// If server not running and START_SERVER=1, start it.
async function ensureServer() {
  if (process.env.SKIP_SERVER === '1') return () => {};
  // Quick ping
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  try {
    const res = await fetchFn(BASE_URL);
    if (res.ok) return () => {};
  } catch { /* ignore connection errors – we'll attempt start */ }
  if (process.env.START_SERVER === '1') {
    console.log('Starting Next server for audit...');
    const proc = spawn('npm', ['run', 'start'], { cwd: ROOT, stdio: 'inherit', shell: process.platform==='win32' });
    await new Promise(r => setTimeout(r, 8000));
    return () => { proc.kill(); };
  } else {
    console.warn('Server not reachable and START_SERVER not set; audit may fail.');
    return () => {};
  }
}

ensureServer().then(close => audit().finally(close));
