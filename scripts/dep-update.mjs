#!/usr/bin/env node
import { execSync } from 'child_process';

function run(cmd) { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }

const outdatedRaw = run('npm outdated --json || echo {}');
let outdated = {};
try { outdated = JSON.parse(outdatedRaw || '{}'); } catch { outdated = {}; }
const updates = Object.entries(outdated).filter(([, info]) => info && info.current !== info.latest);
if (!updates.length) {
  console.log('No outdated dependencies.');
  process.exit(0);
}
console.log('Outdated packages:', updates.map(([n, i]) => `${n} ${i.current}->${i.latest}`).join(', '));

// Apply minor/patch updates automatically; skip major bumps.
const toInstall = updates.filter(([, info]) => {
  const curMajor = parseInt(info.current.split('.')[0].replace(/[^0-9]/g,'')) || 0;
  const latestMajor = parseInt(info.latest.split('.')[0].replace(/[^0-9]/g,'')) || 0;
  return latestMajor === curMajor; // same major => safe-ish
}).map(([name, info]) => `${name}@${info.latest}`);

if (!toInstall.length) {
  console.log('No safe (same-major) updates to apply.');
  process.exit(0);
}
console.log('Applying updates:', toInstall.join(' '));
run(`npm install ${toInstall.join(' ')} --save-exact`);

// Run build & tests quickly to validate
try {
  run('npm run type-check');
  run('npm test -- --run --passWithNoTests');
} catch {
  console.error('Validation failed after updates. Reverting changes.');
  run('git checkout -- package.json package-lock.json');
  process.exit(1);
}

console.log('Dependency updates validated.');
