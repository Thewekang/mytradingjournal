#!/usr/bin/env node
import fs from 'fs';

// Current point-in-time summary
const summary = {
  timestamp: new Date().toISOString(),
  coverage: null,
  audit: null,
  snyk: null
};

// Helper safe JSON read
function readJSON(path) {
  try { return JSON.parse(fs.readFileSync(path,'utf8')); } catch { return null; }
}

// Coverage (v8 summary) -> keep total object
const cov = readJSON('coverage/coverage-summary.json');
if (cov?.total) summary.coverage = cov.total;

// Snyk results
const snyk = readJSON('snyk-results.json');
if (snyk) summary.snyk = { uniqueVulns: snyk.vulnerabilities?.length || 0 };

// npm audit results (if separately captured as audit-results.json)
const audit = readJSON('audit-results.json');
if (audit?.vulnerabilities) {
  summary.audit = { vulnerabilities: Object.keys(audit.vulnerabilities).length };
}

// Persist primary summary file
fs.writeFileSync('security-dashboard.json', JSON.stringify(summary, null, 2));
console.log('[security-dashboard] summary written');

// ---- History maintenance ----
// We maintain a rolling history file to power trend charts. The publish workflow
// attempts to retrieve the existing history from the gh-pages branch into the
// working directory before invoking this script.
const HISTORY_FILE = 'security-dashboard-history.json';
let history = [];
try {
  if (fs.existsSync(HISTORY_FILE)) {
    const parsed = readJSON(HISTORY_FILE);
    if (Array.isArray(parsed)) history = parsed;
  }
} catch { /* ignore history read errors */ }

// Extract compact record for history (avoid storing large full coverage object)
function pct(val) { return typeof val === 'number' ? val : (val?.pct ?? null); }
const record = {
  timestamp: summary.timestamp,
  coverage: summary.coverage ? {
    lines: pct(summary.coverage.lines),
    branches: pct(summary.coverage.branches),
    functions: pct(summary.coverage.functions),
    statements: pct(summary.coverage.statements)
  } : null,
  snykUniqueVulns: summary.snyk?.uniqueVulns ?? null,
  auditVulns: summary.audit?.vulnerabilities ?? null
};

// Only append if this timestamp differs from last (avoid duplicate during same run)
const last = history[history.length - 1];
if (!last || last.timestamp !== record.timestamp) {
  history.push(record);
}

// Cap history length to 200 entries to avoid unbounded growth
if (history.length > 200) history = history.slice(history.length - 200);

fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
console.log(`[security-dashboard] history entries: ${history.length}`);
