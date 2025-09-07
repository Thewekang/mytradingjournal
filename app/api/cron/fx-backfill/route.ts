import { authorizeCron } from '@/lib/cron/auth';
import { recordCronRun } from '@/lib/cron/log';
import { getFxRate } from '@/lib/services/fx-service';

interface BackfillBody {
  base: string;
  quote: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

function parseDateOnly(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const auth = await authorizeCron(req);
  if (!auth.authorized) return Response.json({ error: auth.reason || 'unauthorized' }, { status: 401 });

  let body: BackfillBody | null = null;
  try {
    body = (await req.json()) as BackfillBody;
  } catch {
    // no body or invalid JSON
  }

  const base = (body?.base || '').toUpperCase();
  const quote = (body?.quote || '').toUpperCase();
  const now = new Date();
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultStart = new Date(defaultEnd);
  // default last 90 days
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 89);

  const fromDate = body?.from ? parseDateOnly(body.from) : defaultStart;
  const toDate = body?.to ? parseDateOnly(body.to) : defaultEnd;

  if (!base || !quote) {
    return Response.json({ error: 'base_and_quote_required' }, { status: 400 });
  }
  if (!fromDate || !toDate || fromDate > toDate) {
    return Response.json({ error: 'invalid_date_range' }, { status: 400 });
  }

  const started = Date.now();
  try {
  const cur = new Date(fromDate);
    let total = 0;
    let hits = 0;
    // Iterate inclusive of end date
    while (cur <= toDate) {
      const dStr = formatDateOnly(cur);
      total++;
      const rate = await getFxRate(dStr, base, quote);
      if (rate != null) hits++;
      // next day
  cur.setUTCDate(cur.getUTCDate() + 1);
    }
    const dur = Date.now() - started;
    recordCronRun('fx-backfill', 'success', dur, `base=${base} quote=${quote} days=${total} hits=${hits}`).catch(() => {});
    return Response.json({ data: { base, quote, from: formatDateOnly(fromDate), to: formatDateOnly(toDate), days: total, populated: hits, durationMs: dur } });
  } catch (e) {
    const dur = Date.now() - started;
    recordCronRun('fx-backfill', 'failure', dur, (e as any)?.message).catch(() => {}); // eslint-disable-line @typescript-eslint/no-explicit-any
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
