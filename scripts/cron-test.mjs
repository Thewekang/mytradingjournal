// Simple cron endpoint tester. Reads env vars and POSTs with required headers.
// Env: CRON_URL, CRON_SECRET, VERCEL_BYPASS_SECRET

const url = process.env.CRON_URL;
const cronSecret = process.env.CRON_SECRET;
const bypass = process.env.VERCEL_BYPASS_SECRET;

if (!url) {
  console.error('CRON_URL env var is required');
  process.exit(1);
}

const headers = {};
if (cronSecret) headers['x-cron-secret'] = cronSecret;
if (bypass) headers['x-vercel-protection-bypass'] = bypass;

async function run() {
  let lastStatus = 0;
  let lastText = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt} POST ${url}`);
      const res = await fetch(url, { method: 'POST', headers });
      lastStatus = res.status;
      lastText = await res.text();
      console.log('Status:', lastStatus);
      console.log('Body:', lastText);
      if (res.ok) return 0;
    } catch (e) {
      lastText = e?.message || String(e);
      console.error('Error:', lastText);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.error(`Failed after retries. Last status=${lastStatus}`);
  return 1;
}

run().then(code => process.exit(code));
