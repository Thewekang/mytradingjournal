// Run migrations and seed before Playwright starts the Next.js server
// Ensures a known admin user exists for credential sign-in and trade flow
import { execSync } from 'node:child_process';

/** @type {import('@playwright/test').FullConfig} */
export default async function globalSetup() {
  try {
  // Apply migrations (client should already be generated during build)
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    // Seed with defaults if not provided (script falls back to admin@example.com/admin123)
    execSync('node --env-file=.env.local scripts/seed.mjs', { stdio: 'inherit' });
  } catch (e) {
    console.error('Global setup failed:', e);
    throw e;
  }
}
