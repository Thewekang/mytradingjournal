// No request params currently needed

// Experimental PDF dashboard export. Feature flag: ENABLE_PDF_EXPORT=1
// Uses Playwright chromium when enabled (must be installed manually as dev dep).

// Playwright types optional; use broad typings to avoid hard dependency when not installed in some envs.

import { withLogging } from '@/lib/api/logger-wrapper';

async function _GET() {
  if (process.env.ENABLE_PDF_EXPORT !== '1') {
    return new Response('PDF export disabled', { status: 501 });
  }
  // Use unknown for browser then narrow after dynamic import to avoid type import requirement
  let browser: unknown;
  try {
    let playwright: typeof import('playwright');
    try {
      playwright = await import('playwright');
    } catch {
      return new Response('playwright not installed (npm i -D playwright)', { status: 500 });
    }
    const { chromium } = playwright;
  browser = await chromium.launch();
  interface PdfPage { goto: (url: string, opts: { waitUntil: 'networkidle' }) => Promise<unknown>; addStyleTag: (opts: { content: string }) => Promise<unknown>; pdf: (opts: { format: string; printBackground: boolean }) => Promise<Uint8Array | Buffer> }
  const page = await (browser as { newPage: () => Promise<PdfPage> }).newPage();
    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    await page.goto(base + '/dashboard?print=1', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '@page { margin:12mm; } body { background:white !important; }' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  const bodyArr = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer as Buffer);
  const arrBuf = bodyArr instanceof Uint8Array ? bodyArr.slice().buffer : new Uint8Array(bodyArr as unknown as ArrayBufferLike).slice().buffer;
  const blob = new Blob([arrBuf], { type: 'application/pdf' });
  return new Response(blob, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="dashboard-snapshot.pdf"' } });
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'error';
    return new Response('PDF generation failed: ' + msg, { status: 500 });
  } finally {
    if (browser && typeof browser === 'object' && browser && 'close' in browser) {
      try { await (browser as { close: () => Promise<void> }).close(); } catch { /* ignore */ }
    }
  }
}

export const GET = withLogging(_GET, 'GET /api/dashboard/export/pdf');
