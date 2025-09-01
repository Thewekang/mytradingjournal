#!/usr/bin/env node
import https from 'https';
import url from 'url';

const webhook = process.env.COVERAGE_WEBHOOK_URL;
if (!webhook) {
  console.error('COVERAGE_WEBHOOK_URL not set; skipping notification.');
  process.exit(0);
}

const message = process.argv.slice(2).join(' ') || 'Coverage report notification';

function send(body) {
  const parsed = url.parse(webhook);
  const data = JSON.stringify(body);
  const opts = {
    method: 'POST',
    hostname: parsed.hostname,
    path: parsed.path,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };
  const req = https.request(opts, res => {
    if (res.statusCode && res.statusCode >= 300) {
      console.error('Webhook post failed', res.statusCode);
    }
  });
  req.on('error', err => console.error('Webhook error', err));
  req.write(data);
  req.end();
}

// Format for Slack-compatible incoming webhook
send({ text: message });