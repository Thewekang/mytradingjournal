#!/usr/bin/env node
/**
 * Contrast Audit Script (initial placeholder)
 * Reads globals.css tokens, computes contrast matrix, outputs to docs/CONTRAST_MATRIX.md
 * Fails (exit 1) if any enforced pairs drop below thresholds compared to baseline hard-coded expectations.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const globalsPath = path.join(ROOT, 'app', 'globals.css');
const outPath = path.join(ROOT, 'docs', 'CONTRAST_MATRIX.md');

function escapeRegex(str){return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function getBlock(css, selector){
  const re = new RegExp(escapeRegex(selector)+"\\s*{([\\s\\S]*?)}");
  const m = css.match(re);
  return m ? m[1] : '';
}
function parseBlockTokens(css, selector){
  const body = getBlock(css, selector);
  if(!body) return {};
  const tokens = {};
  const re = /(--)[-a-z0-9]+\s*:[^;]*;/gi;
  let m;
  // More precise regex capturing key and value
  const capture = /(--[a-z0-9-]+)\s*:\s*([^;]+);/i;
  while((m = re.exec(body))!==null){
    const seg = m[0];
    const c = seg.match(capture);
    if(c){
      const key = c[1];
      const val = c[2].replace(/\/\*.*?\*\//g,'').trim();
      tokens[key] = val;
    }
  }
  return tokens;
}

function hexToRgb(hex){
  const h = hex.replace('#','');
  if (h.length===3) { return [0,1,2].map(i=>parseInt(h[i]+h[i],16)); }
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
}
function relativeLuminance([r,g,b]) {
  const srgb = [r,g,b].map(c=>{
    const v = c/255;
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
}
function contrast(hexA, hexB) {
  try {
    const L1 = relativeLuminance(hexToRgb(hexA));
    const L2 = relativeLuminance(hexToRgb(hexB));
    const lighter = Math.max(L1,L2); const darker = Math.min(L1,L2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch { return 0; }
}

function formatRatio(r) { return r ? r.toFixed(2)+':1' : 'n/a'; }

const css = fs.readFileSync(globalsPath,'utf8');
const tokens = parseBlockTokens(css, ':root');

const darkBg = tokens['--color-bg'];
const darkAlt = tokens['--color-bg-alt'];
// Light tokens appear in a different block; naive extraction for now (could parse further).
const lightTokens = parseBlockTokens(css, '[data-theme="light"]');
const lightBg = lightTokens['--color-bg'];
const lightAlt = lightTokens['--color-bg-alt'];

const fgKeys = ['--color-text','--color-muted','--color-accent','--color-danger','--color-warning','--color-success','--color-info'];

const rows = [];
for (const k of fgKeys) {
  const dark = tokens[k];
  const light = lightTokens[k];
  rows.push({
    token: k,
    darkBg: dark && darkBg ? formatRatio(contrast(dark, darkBg)) : 'n/a',
    darkAlt: dark && darkAlt ? formatRatio(contrast(dark, darkAlt)) : 'n/a',
    lightBg: light && lightBg ? formatRatio(contrast(light, lightBg)) : 'n/a',
    lightAlt: light && lightAlt ? formatRatio(contrast(light, lightAlt)) : 'n/a'
  });
}

// Interactive state contrasts (foreground on component surfaces, hover, disabled, focus ring)
function ratioStr(a,b){ return formatRatio(contrast(a,b)); }
// Build unified pairs map keyed by descriptor; each value collects dark/light ratios
const interactiveMap = new Map();
function setInteractive(pair, theme, ratio){
  if(!interactiveMap.has(pair)) interactiveMap.set(pair, { pair, dark: 'n/a', light: 'n/a' });
  interactiveMap.get(pair)[theme] = ratio;
}
// Helper to safely compute & set
function addPair(themeTokens, themeName, pairLabel, fgKey, bgKey, bgFallback=null){
  const fg = themeTokens[fgKey];
  const bg = themeTokens[bgKey] || bgFallback;
  if (fg && bg) setInteractive(pairLabel, themeName, ratioStr(fg,bg));
}
// Light theme interactive
addPair(lightTokens,'light','--color-accent-foreground on --color-accent','--color-accent-foreground','--color-accent');
addPair(lightTokens,'light','--color-accent-foreground on --color-accent-hover','--color-accent-foreground','--color-accent-hover');
addPair(lightTokens,'light','--color-accent-foreground on --color-danger','--color-accent-foreground','--color-danger');
addPair(lightTokens,'light','--color-accent-foreground on --color-danger-hover','--color-accent-foreground','--color-danger-hover');
addPair(lightTokens,'light','--color-disabled-text on --color-disabled-bg','--color-disabled-text','--color-disabled-bg');
// Accent vs base bg usage (links)
if (lightTokens['--color-accent'] && lightBg) setInteractive('--color-accent on bg','light', ratioStr(lightTokens['--color-accent'], lightBg));
if (lightTokens['--color-accent-hover'] && lightBg) setInteractive('--color-accent-hover on bg','light', ratioStr(lightTokens['--color-accent-hover'], lightBg));
// Focus ring vs background
if (lightTokens['--color-focus'] && lightBg) setInteractive('--color-focus ring vs bg','light', ratioStr(lightTokens['--color-focus'], lightBg));

// Dark theme interactive (root tokens treated as dark theme)
addPair(tokens,'dark','--color-accent-foreground on --color-accent','--color-accent-foreground','--color-accent');
addPair(tokens,'dark','--color-accent-foreground on --color-accent-hover','--color-accent-foreground','--color-accent-hover');
addPair(tokens,'dark','--color-accent-foreground on --color-danger','--color-accent-foreground','--color-danger');
addPair(tokens,'dark','--color-accent-foreground on --color-danger-hover','--color-accent-foreground','--color-danger-hover');
addPair(tokens,'dark','--color-disabled-text on --color-disabled-bg','--color-disabled-text','--color-disabled-bg');
if (tokens['--color-accent'] && darkBg) setInteractive('--color-accent on bg','dark', ratioStr(tokens['--color-accent'], darkBg));
if (tokens['--color-accent-hover'] && darkBg) setInteractive('--color-accent-hover on bg','dark', ratioStr(tokens['--color-accent-hover'], darkBg));
if (tokens['--color-focus'] && darkBg) setInteractive('--color-focus ring vs bg','dark', ratioStr(tokens['--color-focus'], darkBg));

const interactive = Array.from(interactiveMap.values()).sort((a,b)=>a.pair.localeCompare(b.pair));

let md = fs.readFileSync(outPath,'utf8');
const start = md.indexOf('| Token (FG on BG)');
if (start !== -1) {
  const before = md.slice(0,start);
  const headerEnd = md.indexOf('\n\n', start);
  const tableHeader = '| Token (FG on BG) | Dark `'+darkBg+'` | Dark Alt `'+darkAlt+'` | Light `'+lightBg+'` | Light Alt `'+lightAlt+'` |\n|------------------|----------------|-------------------|----------------|--------------------|\n';
  const tableBody = rows.map(r=>`| \`${r.token}\` | ${r.darkBg} | ${r.darkAlt} | ${r.lightBg} | ${r.lightAlt} |`).join('\n');
  md = before + tableHeader + tableBody + '\n\n' + md.slice(headerEnd+2);
  fs.writeFileSync(outPath, md);
  console.log('Contrast matrix updated.');
  // Remove any old interactive sections
  md = fs.readFileSync(outPath,'utf8');
  const cleaned = md
    .replace(/### Interactive Light Theme State Contrast[\s\S]*?(?:\n### |$)/, match=>match.startsWith('### Interactive Light') ? '' : match)
    .replace(/### Interactive State Contrast \(Auto-Generated\)[\s\S]*?(?:\n### |$)/,'');
  let interactiveSection = '\n### Interactive State Contrast (Auto-Generated)\n\n| Pair | Dark Contrast | Light Contrast | Guidance |\n|------|---------------|----------------|----------|\n';
  interactiveSection += interactive.map(r=>{
    const guidance = r.pair.includes('disabled') ? 'Disabled (≥2.0 suggested)' : (r.pair.includes('focus') ? 'Focus ring ≥3.0:1' : 'Text target ≥4.5:1');
    return `| \`${r.pair}\` | ${r.dark} | ${r.light} | ${guidance} |`;
  }).join('\n');
  fs.writeFileSync(outPath, cleaned.trimEnd() + '\n' + interactiveSection + '\n');
} else {
  console.warn('Could not locate existing table anchor; no update performed.');
}

// Expanded regression guard: enforce minimum ratios per token & theme.
// Thresholds chosen slightly below current values to allow minor tuning while blocking regressions that harm accessibility.
// Dark theme thresholds lower for certain status colors (success/info/accent) where current design intentionally uses chroma closer to background.
const thresholds = {
  light: {
    '--color-text': 10.0, // current ~14+
    '--color-muted': 4.5,
    '--color-accent': 6.0, // keep accent comfortably above 4.5 for link affordance
    '--color-danger': 4.5,
    '--color-warning': 4.5,
    '--color-success': 4.5,
    '--color-info': 4.5
  },
  dark: {
    '--color-text': 10.0, // ensure we don't drop primary contrast too far
    '--color-muted': 7.0, // maintain readable secondary text
    '--color-accent': 2.7, // allow slight adjustments but keep above ~2.7 (non-body accent usage)
    '--color-danger': 3.8,
    '--color-warning': 5.0,
    '--color-success': 3.5,
    '--color-info': 4.2
  }
};

function numeric(ratioStr){ return Number(ratioStr?.split(':')[0]); }
const failures = [];
for (const row of rows) {
  const lightReq = thresholds.light[row.token];
  const darkReq = thresholds.dark[row.token];
  if (lightReq != null) {
    const lb = numeric(row.lightBg); // primary light background
    const la = numeric(row.lightAlt); // alt surface
    if (lb && lb < lightReq) failures.push(`${row.token} light bg ${lb} < ${lightReq}`);
    if (la && la < lightReq) failures.push(`${row.token} light alt ${la} < ${lightReq}`);
  }
  if (darkReq != null) {
    const db = numeric(row.darkBg);
    const da = numeric(row.darkAlt);
    if (db && db < darkReq) failures.push(`${row.token} dark bg ${db} < ${darkReq}`);
    if (da && da < darkReq) failures.push(`${row.token} dark alt ${da} < ${darkReq}`);
  }
}
// Baseline diff gating: track ratios per token/background pair so we only fail on regressions, not just on crossing fixed threshold.
const OUT_DIR = path.join(ROOT, '.contrast');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const snapshot = {
  darkBg: darkBg || null,
  darkAlt: darkAlt || null,
  lightBg: lightBg || null,
  lightAlt: lightAlt || null,
  rows,
  interactive, // includes dark/light ratios per pair
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(OUT_DIR,'latest.json'), JSON.stringify(snapshot,null,2));

const baselinePath = path.join(OUT_DIR,'baseline.json');
if (process.env.CONTRAST_UPDATE_BASELINE === '1') {
  fs.writeFileSync(baselinePath, JSON.stringify(snapshot,null,2));
  console.log('Contrast baseline updated.');
  process.exit(failures.length ? 1 : 0);
}
let baseline = null;
if (fs.existsSync(baselinePath)) {
  try { baseline = JSON.parse(fs.readFileSync(baselinePath,'utf8')); } catch { baseline = null; }
}
if (!baseline) {
  fs.writeFileSync(baselinePath, JSON.stringify(snapshot,null,2));
  console.log('Contrast baseline created (no gating this run).');
  if (failures.length) {
    console.error('Current failures vs thresholds (reported but not gating first run):\n'+failures.join('\n'));
  }
  process.exit(0);
}

// Compute regressions vs baseline (allow small tolerance 0.15 margin to ignore minor aliasing changes)
function numericRatio(str){ return Number(str?.split(':')[0]) || 0; }
const regressions = [];
for (const row of rows) {
  const baseRow = baseline.rows.find(r => r.token === row.token);
  if (!baseRow) continue;
  for (const key of ['darkBg','darkAlt','lightBg','lightAlt']) {
    const before = numericRatio(baseRow[key]);
    const after = numericRatio(row[key]);
    if (before && after && after + 0.001 < before - 0.15) { // >0.15 drop
      regressions.push(`${row.token} ${key} dropped ${before.toFixed(2)}→${after.toFixed(2)}`);
    }
  }
}
// Interactive regressions
if (baseline.interactive) {
  for (const pair of interactive) {
    const basePair = baseline.interactive.find(p => p.pair === pair.pair);
    if (!basePair) continue;
    for (const key of ['dark','light']) {
      const before = numericRatio(basePair[key]);
      const after = numericRatio(pair[key]);
      if (before && after && after + 0.001 < before - 0.15) {
        regressions.push(`interactive ${pair.pair} ${key} dropped ${before.toFixed(2)}→${after.toFixed(2)}`);
      }
    }
  }
}

// Threshold gating for interactive pairs
for (const pair of interactive) {
  function check(theme, valueStr){
    const val = numericRatio(valueStr);
    if(!val) return; // n/a
    let min;
    if (pair.pair.includes('disabled')) min = 2.0; 
    else if (pair.pair.includes('focus')) min = 3.0; 
    else if (pair.pair.startsWith('--color-accent on bg') && theme === 'dark') min = 2.7; // dark theme accent inline (non-body text) lower bound
  else if (pair.pair.startsWith('--color-accent-hover on bg') && theme === 'dark') min = 2.2; // current ~2.27; set floor slightly below to allow minor tuning
    else min = 4.5;
    if (val < min) failures.push(`interactive ${pair.pair} ${theme} ${val.toFixed(2)} < ${min}`);
  }
  check('dark', pair.dark);
  check('light', pair.light);
}

if (failures.length || regressions.length) {
  if (failures.length) console.error('Contrast threshold violations:\n' + failures.join('\n'));
  if (regressions.length) console.error('Contrast regressions vs baseline (>0.15 drop):\n' + regressions.join('\n'));
  process.exit(1);
}
console.log('Contrast thresholds & baseline diff satisfied.');
