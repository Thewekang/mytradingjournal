import { beforeEach } from 'vitest';
import { act } from 'react';
import axeCore from 'axe-core';

// ---------------------------------------------------------------------------
// Polyfills (must execute before components mount)
// ---------------------------------------------------------------------------

// ResizeObserver polyfill sufficient for Recharts ResponsiveContainer in tests.
// Provides a minimal implementation that triggers the supplied callback once
// (and again on subsequent microtasks if multiple elements observed) with a
// synthetic contentRect based on getBoundingClientRect where available.
// We intentionally keep this lightweight; charts under test are static.
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  const schedule = (fn: () => void) => (typeof queueMicrotask === 'function' ? queueMicrotask(fn) : setTimeout(fn, 0));
  class RO {
    private readonly _callback: (entries: unknown[], observer: RO) => void;
    private _observed = new Set<Element>();
    private _scheduled = false;
    constructor(cb: (entries: unknown[], observer: RO) => void) { this._callback = cb; }
    private _flush() {
      this._scheduled = false;
      if (!this._observed.size) return;
      const entries = Array.from(this._observed).map(el => {
        const rect = typeof (el as HTMLElement).getBoundingClientRect === 'function'
          ? (el as HTMLElement).getBoundingClientRect()
          : new DOMRectReadOnly(0,0,0,0);
        return { target: el, contentRect: rect };
      });
  try { act(() => { this._callback(entries, this); }); } catch (err) { console.error('ResizeObserver callback error', err); }
    }
    private _scheduleOnce() {
      if (this._scheduled) return;
      this._scheduled = true;
      schedule(() => this._flush());
    }
    observe(target: Element) { this._observed.add(target); this._scheduleOnce(); }
    unobserve(target: Element) { this._observed.delete(target); }
    disconnect() { this._observed.clear(); }
  }
  (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
}

// Provide a stable non-zero layout box for elements so Recharts doesn't warn about 0x0 containers.
// We only override if jsdom's default would yield 0 sizes.
const origGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
HTMLElement.prototype.getBoundingClientRect = function() {
  const rect = origGetBoundingClientRect.apply(this);
  // If all dimensions 0, substitute a default test box.
  if (!rect.width && !rect.height) {
    return new DOMRect(0, 0, 800, 400);
  }
  return rect;
};

// Skip integration tests gracefully if real DB not configured
const missingRealDb = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('invalid/skip');

// Patch test context global flag (augment global type inline)
declare global { var __SKIP_DB__: boolean | undefined }
globalThis.__SKIP_DB__ = missingRealDb;

// Stub canvas to silence jsdom axe color-contrast pathways requiring getContext
// Always override to avoid jsdom's unimplemented errors during axe color contrast checks
HTMLCanvasElement.prototype.getContext = function() {
  return {
    getImageData: () => ({ data: new Uint8ClampedArray(4) })
  } as unknown as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

// Common axe runner helper available in tests
export async function runAxeFiltered(root: Document | HTMLElement = document) {
  // Ensure minimal document semantics for axe (jsdom lacks Next.js head injection here)
  if (document.documentElement && !document.documentElement.getAttribute('lang')) {
    document.documentElement.setAttribute('lang', 'en');
  }
  if (!document.title) {
    document.title = 'Test';
  }
  const results = await axeCore.run(root, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] } });
  const IGNORE_RULE_IDS = new Set([
    'color-contrast' // handled via separate visual regression / design token contrast audit
  ]);
  results.violations = results.violations.filter(v => !IGNORE_RULE_IDS.has(v.id));
  if (results.violations.length) {
  // Log concise table for debugging a11y issues
  // eslint-disable-next-line no-console
  console.log('[axe] violations', results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0,3).map(n => n.target.join(' ')).join(' | ') })));
  }
  return results;
}

beforeEach(function(ctx) {
  if (missingRealDb) {
    // Convention: test title contains [db] for integration tests
    if (ctx.task.name.includes('[db]')) ctx.skip();
  }
});
