#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const deprecated = [/ENABLE_EXPORT_QUEUE/, /ENABLE_PERSIST_EXPORT/];
const roots = ['app','lib','tests','docs','.github/workflows','middleware.ts','README.md'];
let hits = [];

function walk(p){
  try {
    const s = statSync(p);
    if (s.isDirectory()) {
      for (const f of readdirSync(p)) walk(join(p,f));
    } else if (s.isFile()) {
      const txt = readFileSync(p,'utf8');
      for (const re of deprecated){
        if (re.test(txt)) {
          // Allow references inside CHANGELOG (migration note) only
          if (p.endsWith('CHANGELOG.md')) continue;
          hits.push(p);
          break;
        }
      }
    }
  } catch { /* ignore */ }
}

for (const r of roots) walk(r);

if (hits.length){
  console.error(`Deprecated export flags detected in files:\n` + hits.map(h=>` - ${h}`).join('\n'));
  process.exit(1);
} else {
  console.log('No deprecated export flags found.');
}
