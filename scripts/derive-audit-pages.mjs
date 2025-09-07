#!/usr/bin/env node
/**
 * Determine which audit pages need to run based on changed files.
 * Strategy:
 * 1. Read changed-files-audit-map.json which maps logical groups to file path prefixes.
 * 2. Build dependency graph page -> groups.
 * 3. Get changed files via `git diff --name-only origin/MAIN_BRANCH...HEAD` (fallback to last commit if remote missing).
 * 4. If any changed file matches a group path prefix, include that page.
 * 5. If tokens/global UI changed, we include all pages (broad impact).
 * 6. Output comma-separated page list to stdout (for piping into AUDIT_PAGES env) or write to .audit/derived-pages.json for debugging.
 *
 * Env overrides:
 *  - BASE_REF: alternate base ref (default origin/main)
 *  - FORCE_ALL=1: return full list from audit-pages.json ignoring diff.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { computeDerivedPages } from './derive-audit-pages-core.mjs';

const ROOT = process.cwd();
const MAP_PATH = path.join(ROOT,'scripts','changed-files-audit-map.json');
const PAGES_CFG_PATH = path.join(ROOT,'scripts','audit-pages.json');
const OUT_DIR = path.resolve(ROOT,'.audit');
try { if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR,{recursive:true}); } catch (e) { console.warn('Unable to create .audit directory', e.message); }

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
const map = readJson(MAP_PATH);
if (!map) { console.error('No changed-files-audit-map.json found. Falling back to full page list.'); }
let pagesCfg = ['/','/dashboard','/trades','/goals','/settings'];
const pagesJson = readJson(PAGES_CFG_PATH);
if (pagesJson && Array.isArray(pagesJson.pages)) pagesCfg = pagesJson.pages;

if (process.env.FORCE_ALL === '1' || !map) {
  console.log(pagesCfg.join(','));
  process.exit(0);
}

const baseRef = process.env.BASE_REF || 'origin/main';
let changed = [];
// Allow test / override injection of changed file list via env (comma separated)
if (process.env.AUDIT_CHANGED_FILES) {
  changed = process.env.AUDIT_CHANGED_FILES.split(',').filter(Boolean);
}
try {
  const raw = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
  changed = raw.split(/\r?\n/).filter(Boolean);
  if (!changed.length) {
    // Fallback: compare to previous commit
    const raw2 = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
    changed = raw2.split(/\r?\n/).filter(Boolean);
  }
} catch (e) {
  console.warn('Unable to derive changed files via git; defaulting to all pages.', e.message);
  console.log(pagesCfg.join(','));
  process.exit(0);
}

const derived = computeDerivedPages({ changedFiles: changed, map, pagesCfg });
// (Optional) could write debug file; currently skipped due to intermittent Windows path issues.
// console.log('Derived pages meta:', JSON.stringify({ baseRef, changedCount: changed.length }));
process.stdout.write(derived.join(','));
