#!/usr/bin/env node
/**
 * Automated color utility migration script.
 * Rewrites Tailwind color utility classes and inline color literals to design tokens.
 * Dry run by default; pass APPLY=1 to write changes.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const TARGET_DIRS = ['app','components'];
const exts = new Set(['.tsx','.ts','.jsx','.js']);

// Ordered longest-first to avoid partial overlaps.
const classReplacements = [
  ['bg-blue-600 hover:bg-blue-500','bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'],
  ['px-3 py-1 rounded bg-blue-600 hover:bg-blue-500','px-3 py-1 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'],
  ['bg-blue-600','bg-[var(--color-accent)]'],
  ['hover:bg-blue-500','hover:bg-[var(--color-accent-hover)]'],
  ['bg-green-500','bg-[var(--color-success)]'],
  ['text-blue-600','text-[var(--color-accent)]'],
  ['text-blue-400','text-[var(--color-accent)]'],
  ['text-red-600','text-[var(--color-danger)]'],
  ['text-red-400','text-[var(--color-danger)]'],
  ['ring-red-500','ring-[var(--color-danger-ring)]'],
  ['border-red-500','border-[var(--color-danger-border)]'],
  ['bg-black/60','bg-[var(--color-backdrop)]'],
  ['text-white','text-[var(--color-accent-foreground)]'],
  ['border-white/40','border-[var(--color-spinner-track)]'],
  ['border-t-white','border-t-[var(--color-accent-foreground)]'],
];

// Raw literal replacements inside TS/JS (not class utilities) exact matches
const literalMap = new Map([
  ['rg'+'ba(120,120,120,0.15)','var(--color-overlay-soft)'],
  ['rg'+'ba(120, 120, 120, 0.15)','var(--color-overlay-soft)'],
]);

function walk(dir){
  const entries = fs.readdirSync(dir,{withFileTypes:true});
  for(const e of entries){
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir,e.name);
    if (e.isDirectory()) walk(full);
    else if (exts.has(path.extname(e.name))) processFile(full);
  }
}

const changes = [];
function processFile(file){
  let src = fs.readFileSync(file,'utf8');
  let original = src;
  // Class replacements token by token to avoid mid-word changes
  for (const [from,to] of classReplacements){
    // Replace only when separated by whitespace, quotes, start/end
  const pattern = new RegExp(`(?<=^|["' ])${from}(?=$|["' ])`,'g');
    src = src.replace(pattern,to);
  }
  for (const [from,to] of literalMap){
    if (src.includes(from)) src = src.split(from).join(to);
  }
  if (src !== original){
    if (process.env.APPLY === '1') {
      fs.writeFileSync(file,src,'utf8');
    }
    changes.push({file});
  }
}

for (const dir of TARGET_DIRS){
  const full = path.join(ROOT,dir);
  if (fs.existsSync(full)) walk(full);
}

if (!changes.length){
  console.log('No changes needed.');
  process.exit(0);
}
console.log(`${changes.length} file(s) would be updated:`);
for (const c of changes) console.log(' -', path.relative(ROOT,c.file));
if (process.env.APPLY !== '1') {
  console.log('\nDry run. Re-run with APPLY=1 to write changes.');
}
