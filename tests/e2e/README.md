# E2E Tests

This folder contains Playwright end-to-end tests.

Prereqs for local run:
- .env.local configured with DATABASE_URL
- Run: npm run test:visual (uses playwright.config.mjs)

The global setup runs Prisma migrations and seeds a default admin user if none is configured:
- Email: admin@example.com
- Password: admin123

Override with SEED_USER_EMAIL / SEED_USER_PASSWORD in .env.local.
