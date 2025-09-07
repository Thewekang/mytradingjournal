#!/usr/bin/env node
// Focus ring verification runner that bypasses npm life-cycle scripts (which would
// trigger Prisma migrate / generate) and uses a dedicated Vitest config with a
// stubbed Prisma client alias to avoid native engine initialization.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const vitestBin = path.resolve(here, '../node_modules/vitest/vitest.mjs');

const args = [vitestBin, 'run', '-c', 'vitest.focus.config.ts'];
const env = { ...process.env, FOCUS_TEST: '1', DATABASE_URL: 'file:./skip-invalid?connection_limit=1' };

const proc = spawn(process.execPath, args, { stdio: 'inherit', env });
proc.on('close', code => process.exit(code ?? 0));