#!/usr/bin/env node
/**
 * audit-gate.mjs
 * Starts a temporary production Next server, runs contrast & axe audits against it, then shuts down.
 * Ensures accessibility scan hits the real app HTML (title/lang) instead of a non-running port.
 */
import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
const ROOT = process.cwd();

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function waitForServer(url, timeoutMs=30000){
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, res => { res.resume(); resolve(); });
        req.on('error', reject);
      });
      return true;
    } catch { /* retry */ }
    await wait(500);
  }
  return false;
}

function isPortFree(port){
  return new Promise(resolve => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(()=>resolve(true)))
      .listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(preferred){
  if (preferred && await isPortFree(preferred)) return preferred;
  // Skip 3000/3100 family to avoid dev server collisions; start at 4500
  for (let p=4500; p<4600; p++) {
    if (await isPortFree(p)) return p;
  }
  // Fallback: ephemeral
  return await new Promise(resolve => {
    const srv = net.createServer();
    srv.listen(0, () => { const p = srv.address().port; srv.close(()=>resolve(p)); });
  });
}

async function ensureBuild(){
  const buildDir = path.join(ROOT,'.next');
  if (process.env.AUDIT_FORCE_CLEAN === '1' && fs.existsSync(buildDir)) {
    console.log('[audit-gate] AUDIT_FORCE_CLEAN=1 removing existing .next directory...');
    await fs.promises.rm(buildDir, { recursive: true, force: true });
  }
  if (!fs.existsSync(buildDir) || process.env.SKIP_BUILD !== '1') {
    console.log('[audit-gate] Building Next app (force clean:', process.env.AUDIT_FORCE_CLEAN === '1', ')');
    await new Promise((resolve, reject) => {
      const ps = spawn('npm', ['run','build'], { stdio: 'inherit', shell: true });
      ps.on('exit', code => code === 0 ? resolve() : reject(new Error('Build failed')));
    });
    // Workaround: some runtime requires numeric chunk files at server root (./1234.js) rather than ./chunks/1234.js
    // Copy numeric chunk files into .next/server if missing to avoid MODULE_NOT_FOUND during audit server start.
    try {
      const serverDir = path.join(buildDir,'server');
      const chunksDir = path.join(serverDir,'chunks');
      if (fs.existsSync(chunksDir)) {
        const entries = await fs.promises.readdir(chunksDir);
        const numeric = entries.filter(f => /^(\d+)\.js$/.test(f));
        for (const file of numeric) {
          const target = path.join(serverDir, file);
            if (!fs.existsSync(target)) {
              await fs.promises.copyFile(path.join(chunksDir,file), target);
            }
        }
      }
    } catch (e) {
      console.warn('[audit-gate] Chunk copy shim failed (non-fatal):', e.message);
    }
  }
}

async function runScript(cmd, args, extraEnv={}){
  console.log(`[audit-gate] Running: ${cmd} ${args.join(' ')}`);
  await new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { stdio: 'inherit', shell: true, env: { ...process.env, ...extraEnv } });
    ps.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
  });
}

(async () => {
  await ensureBuild();
  const port = await findAvailablePort(process.env.AUDIT_PORT ? Number(process.env.AUDIT_PORT) : undefined);
  let baseUrl = `http://localhost:${port}`;
  let server;
  async function startServer(attempt=1){
    console.log(`[audit-gate] Starting Next server on ${port} (attempt ${attempt})...`);
    server = spawn('npx', ['next','start','-p', String(port)], { stdio: 'inherit', shell: true });
  let exited = false;
  server.on('exit', () => { exited = true; });
    const ok = await waitForServer(`${baseUrl}/`);
    if (ok) return true;
    if (exited && attempt < 2) {
      console.warn('[audit-gate] Server exited early during startup; retrying with a new port...');
      const newPort = await findAvailablePort();
      const newBase = `http://localhost:${newPort}`;
      // kill any previous just in case
  try { server.kill('SIGTERM'); } catch { /* ignore */ }
      return await (async () => {
        // reassign port/baseUrl vars via object mutation (not const), so convert to let earlier? Simpler: throw to outer for restart.
        throw { _restart: true, newPort, newBase };
      })();
    }
    return false;
  }
  try {
    const started = await startServer();
    if (!started) {
  try { server.kill('SIGTERM'); } catch { /* ignore */ }
      throw new Error('Server failed to start before timeout');
    }
  } catch (e) {
    if (e && e._restart) {
      // restart with new port
      const newPort = e.newPort;
      const newBase = e.newBase;
      console.log(`[audit-gate] Restarting on port ${newPort}...`);
      const started = await (async () => {
        server = spawn('npx', ['next','start','-p', String(newPort)], { stdio: 'inherit', shell: true });
        const ok2 = await waitForServer(`http://localhost:${newPort}/`);
        return ok2;
      })();
      if (!started) {
  try { server.kill('SIGTERM'); } catch { /* ignore */ }
        throw new Error('Server failed to start on retry');
      }
      // override baseUrl for rest of script
  baseUrl = newBase;
    } else {
      throw e;
    }
  }
  // NOTE: baseUrl was const; to allow mutation above we need it declared with let.
  // Verify lang attribute present; retry once if missing
  const hasLang = await new Promise(resolve => {
    http.get(`${baseUrl}/`, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(/<html[^>]+lang=/i.test(d))); }).on('error',()=>resolve(false));
  });
  if (!hasLang) {
    console.warn('[audit-gate] Missing lang attribute on first fetch, retrying...');
    await wait(1200);
    const retryLang = await new Promise(resolve => {
      http.get(`${baseUrl}/`, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(/<html[^>]+lang=/i.test(d))); }).on('error',()=>resolve(false));
    });
    if (!retryLang) console.warn('[audit-gate] Proceeding without detected lang attribute (axe may report).');
  }
  console.log('[audit-gate] Server reachable, executing audits...');
  try {
    await runScript('node', ['scripts/contrast-audit.mjs']);
    await runScript('node', ['scripts/axe-audit.mjs'], { AUDIT_BASE_URL: baseUrl });
    console.log('[audit-gate] All audits passed.');
  } finally {
    console.log('[audit-gate] Shutting down server...');
    server.kill('SIGTERM');
  }
})().catch(err => { console.error('[audit-gate] FAILED:', err.message); process.exit(1); });
