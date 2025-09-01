#!/usr/bin/env node
/**
 * Combined CI audit orchestrator:
 * 1. Runs contrast audit
 * 2. Runs Lighthouse (optional via SKIP_LH)
 * 3. Runs axe accessibility audit
 * Exits non-zero on failure of any.
 */
import { spawn } from 'child_process';

function run(name, cmd, args, env={}) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${name}`);
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform==='win32', env: { ...process.env, ...env } });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${name} failed (${code})`)));
  });
}

(async () => {
  try {
    await run('Contrast Audit', 'node', ['scripts/contrast-audit.mjs']);
    if (process.env.SKIP_LH !== '1') {
      await run('Lighthouse Audit', 'node', ['scripts/lighthouse-audit.mjs'], { START_SERVER: '1' });
    } else {
      console.log('Skipping Lighthouse audit (SKIP_LH=1)');
    }
    await run('Accessibility (axe) Audit', 'node', ['scripts/axe-audit.mjs'], { START_SERVER: '1' });
    console.log('\nAll audits passed.');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
