import { NextRequest } from 'next/server';

// Experimental PDF dashboard export. Feature flag: ENABLE_PDF_EXPORT=1
// Uses Playwright chromium when enabled (must be installed manually as dev dep).

export async function GET(_req: NextRequest) {
  if (process.env.ENABLE_PDF_EXPORT !== '1') {
    return new Response('PDF export disabled', { status: 501 });
  }
  let browser: any;
  try {
    let playwright: any;
    try {
      playwright = await import('playwright');
    } catch {
      return new Response('playwright not installed (npm i -D playwright)', { status: 500 });
    }
    const { chromium } = playwright as any;
    browser = await chromium.launch();
    const page = await browser.newPage();
    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    await page.goto(base + '/dashboard?print=1', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '@page { margin:12mm; } body { background:white !important; }' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    return new Response(pdfBuffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="dashboard-snapshot.pdf"' } });
  } catch (e: any) {
    return new Response('PDF generation failed: ' + (e?.message || 'error'), { status: 500 });
  } finally {
    if (browser) try { await browser.close(); } catch { /* ignore */ }
  }
}
