#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const coverageSummaryPath = path.join(root, 'coverage', 'coverage-summary.json');
const baselinePath = path.join(root, 'coverage-baseline.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function pct(x) { return typeof x === 'number' ? x : (x?.pct ?? 0); }

function extract(summary) {
  // summary totals at summary.total
  const t = summary.total;
  return {
    lines: pct(t.lines.pct ?? t.lines),
    statements: pct(t.statements.pct ?? t.statements),
    functions: pct(t.functions.pct ?? t.functions),
    branches: pct(t.branches.pct ?? t.branches)
  };
}

function diff(current, baseline) {
  return Object.fromEntries(Object.keys(current).map(k => [k, (current[k] - baseline[k])]));
}

function formatDiff(d) {
  return Object.entries(d).map(([k,v]) => `${k}: ${v >= 0 ? '+' : ''}${v.toFixed(2)}%`).join(', ');
}

function ensureCoverageSummary() {
  if (!fs.existsSync(coverageSummaryPath)) {
    console.error('coverage-summary.json not found. Run tests with coverage first.');
    process.exit(1);
  }
}

function ensureBaseline() {
  if (!fs.existsSync(baselinePath)) {
    console.error('coverage-baseline.json not found. Create one with: npm run coverage:baseline');
    process.exit(1);
  }
}

const mode = process.argv[2];
if (!mode || !['update','diff','auto'].includes(mode)) {
  console.error('Usage: coverage-baseline.mjs <update|diff|auto>');
  process.exit(1);
}

ensureCoverageSummary();
const summary = readJSON(coverageSummaryPath);
const current = extract(summary);

if (mode === 'update') {
  const baseline = { ...current, timestamp: Date.now() };
  writeJSON(baselinePath, { _note: 'Generated baseline', ...baseline });
  console.log('Updated coverage baseline:', baseline);
  process.exit(0);
}

if (mode === 'auto') {
  // Ensure baseline exists (create if missing)
  if (!fs.existsSync(baselinePath)) {
    const baseline = { ...current, timestamp: Date.now() };
    writeJSON(baselinePath, { _note: 'Auto-created baseline', ...baseline });
    console.log('Baseline created (auto):', baseline);
    process.exit(0);
  }
  const baselineRaw = readJSON(baselinePath);
  const improved = { ...baselineRaw };
  let changed = false;
  for (const k of ['lines','statements','functions','branches']) {
    if (current[k] > (baselineRaw[k] || 0)) {
      improved[k] = current[k];
      changed = true;
    }
  }
  if (changed) {
    improved.timestamp = Date.now();
    writeJSON(baselinePath, improved);
    console.log('Baseline improved:', diff(current, baselineRaw));
  } else {
    console.log('No improvements over baseline.');
  }
  process.exit(0);
}

// diff mode
ensureBaseline();
const baselineRaw = readJSON(baselinePath);
const baseline = { lines: baselineRaw.lines, statements: baselineRaw.statements, functions: baselineRaw.functions, branches: baselineRaw.branches };
const d = diff(current, baseline);
console.log('Coverage diff vs baseline:', formatDiff(d));

// Fail if any metric drops more than allowed threshold (configurable)
const dropThreshold = parseFloat(process.env.COVERAGE_DROP_MAX || '2'); // percent
const failing = Object.entries(d).filter(([,v]) => v < -dropThreshold);
if (failing.length) {
  console.error('Coverage regression exceeds threshold:', failing.map(([k,v]) => `${k} ${v.toFixed(2)}%`).join(', '));
  process.exit(1);
} else {
  console.log('No significant coverage regression (threshold', dropThreshold+'%).');
}
