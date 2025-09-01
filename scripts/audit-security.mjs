#!/usr/bin/env node
import { execSync } from 'child_process';

function run(cmd) { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }

const level = process.env.AUDIT_LEVEL || 'moderate';
console.log('Running security audit (level: ' + level + ')');
try {
  const output = run(`npm audit --audit-level=${level} --json || true`);
  const data = JSON.parse(output || '{}');
  const advisories = data.vulnerabilities || {};
  const counts = Object.entries(advisories).reduce((acc,[,info]) => {
    const sev = info.severity || 'unknown';
    acc[sev] = (acc[sev]||0)+1; return acc;
  }, {});
  console.log('Vulnerability counts:', counts);
  const failSev = process.env.AUDIT_FAIL_LEVEL || 'high';
  const severities = ['low','moderate','high','critical'];
  const failIndex = severities.indexOf(failSev);
  const shouldFail = Object.entries(counts).some(([sev,count]) => severities.indexOf(sev) >= failIndex && count>0);
  if (shouldFail) {
    console.error(`Audit failed: vulnerabilities at or above ${failSev}.`);
    process.exit(1);
  }
  console.log('Audit passed.');
} catch (e) {
  console.error('Audit processing error', e.message);
  process.exit(1);
}
