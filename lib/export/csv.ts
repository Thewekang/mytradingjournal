// Shared CSV utilities for export endpoints
// Provides simple escaping, full string assembly, and streaming helpers.

const QUOTE_REGEX = /[",\n]/;

export function csvEscape(val: any): string {
  if (val == null) return '';
  const s = String(val);
  return QUOTE_REGEX.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function rowsToCsv(headers: string[], rows: Record<string, any>[]): string {
  const out: string[] = [headers.join(',')];
  for (const r of rows) {
    out.push(headers.map(h => csvEscape(r[h])).join(','));
  }
  return out.join('\n');
}

export function rowsToCsvStream(headers: string[], rows: Record<string, any>[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(headers.join(',') + '\n'));
    },
    pull(controller) {
      while (i < rows.length) {
        const line = headers.map(h => csvEscape(rows[i][h])).join(',') + '\n';
        controller.enqueue(enc.encode(line));
        i++;
        // Yield control periodically for very large datasets
        if (i % 1000 === 0) return; // backpressure
      }
      controller.close();
    }
  });
}
