#!/usr/bin/env node
import 'dotenv/config';

const url = process.env.CRON_EQUITY_REBUILD_URL;
const secret = process.env.CRON_SECRET;

if (!url) {
  console.error('CRON_EQUITY_REBUILD_URL env not set');
  process.exit(1);
}

const res = await fetch(url, { method: 'POST', headers: { 'x-cron-secret': secret || '' } });
console.log('Status', res.status);
if (!res.ok) {
  const txt = await res.text();
  console.error('Error body:', txt.slice(0, 500));
  process.exit(1);
}
console.log('Triggered equity rebuild successfully');
