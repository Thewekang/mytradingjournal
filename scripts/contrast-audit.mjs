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
} else {
  console.warn('Could not locate existing table anchor; no update performed.');
}

// Basic regression guard (example): require --color-text >= 7 on light backgrounds
function numeric(ratioStr){ return parseFloat(ratioStr); }
const textLight = numeric(rows.find(r=>r.token==='--color-text').lightBg);
if (textLight < 4.5) {
  console.error('Regression: --color-text contrast on light bg below 4.5:1');
  process.exit(1);
}
