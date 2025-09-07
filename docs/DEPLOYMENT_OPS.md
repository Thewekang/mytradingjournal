# Deployment & Ops (Milestone 9)

This document describes CI, preview deployments, runtime security headers, basic rate limiting, and containerization.

## CI (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`
- Runs on push/PR to `main`
- Services: Postgres 16 (DATABASE_URL preset to localhost)
- Steps: `npm ci` -> `prisma migrate deploy` -> `prisma generate` -> build -> tests
- Coverage upload to Codecov if `coverage/lcov.info` exists (configure `CODECOV_TOKEN` secret if needed).

## Preview Deployments
- Vercel: connect the repo in Vercel; previews build automatically on PRs.
- GitHub Actions workflow `.github/workflows/preview.yml` uses Vercel CLI:
  - Requires repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
  - The job runs on PRs to `main`, builds with `vercel build`, and deploys `--prebuilt`.
  - Posts the preview URL as a PR comment.
- Container alternative: build an image per PR using the Dockerfile and push to a registry; spin up ephemeral envs via your infra (out of scope here).

## Security Headers
- Configured via `next.config.mjs` `headers()`:
  - Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy,
    Strict-Transport-Security, COOP/CORP.
  - Optional CSP: enable with `ENABLE_CSP=1` (default disabled during development).

## Rate Limiting (basic)
- Env-gated in `middleware.ts` with `ENABLE_RATE_LIMIT=1`.
- Token bucket per IP (in-memory, single-instance only).
- Configure `RATE_LIMIT_WINDOW_MS` (default 60000) and `RATE_LIMIT_MAX` (default 120).
- For production multi-instance, replace with Redis/Upstash or an edge provider.

## Docker
- `Dockerfile` uses Next.js standalone output (`next.config.mjs` sets `output: 'standalone'`).
- Build: `docker build -t mytradingjournal:latest .`
- Run: `docker run -p 3000:3000 -e DATABASE_URL=... mytradingjournal:latest`

## Environment
- DATABASE_URL (Postgres)
- ENABLE_CSP (1 to enable CSP header)
- ENABLE_RATE_LIMIT (1 to enable middleware rate limiting)
- CRON_SECRET (for protected cron endpoints)
- NEXTAUTH_SECRET, NEXTAUTH_URL (auth)
- Optional: Sentry/OTEL envs when observability rollout continues in Milestone 9.

See `.env.example` for a complete template and defaults.

## Observability & Log Shipping
- Instrumentation: already wired with minimal spans around exports/analytics and structured logs.
- Request correlation: all API responses carry `x-request-id`; logs include the same `reqId` for end-to-end tracing. You may propagate an incoming `x-request-id` from your gateway.
- Env flags:
  - Sentry: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` (e.g., 0.1 in prod), `SENTRY_ENVIRONMENT`.
  - OpenTelemetry (optional): `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`.
  - Log level: `LOG_LEVEL` (default `info`); consider `warn` in prod.
- Shipping options:
  1) Sentry: enable DSN; spans and errors ship automatically.
  2) OTEL Collector: point `OTEL_EXPORTER_OTLP_ENDPOINT` to your collector; forward to Grafana/Tempo/Jaeger.
  3) Pino transport: add a transport in production (e.g., to Loki) behind `ENABLE_LOG_SHIP=1`.
- PII hygiene: keep logs sparse; avoid email/user identifiers beyond hashed or masked; disable verbose levels in prod.

## Cron Scheduling (Equity Rebuild, Export Perf Prune, Backup Verify)
- Endpoints (require header `x-cron-secret: $CRON_SECRET`):
  - `POST /api/cron/equity-rebuild` (all users)
  - `POST /api/cron/equity-rebuild-user?userId=...&fromDate=...` (single user)
  - `POST /api/cron/export-perf-prune`
  - `GET /api/cron/backup-verify`
- Schedule with your provider (GitHub Actions, cloud scheduler, or external runner) to hit these URLs.
- Recommended cadences:
  - Equity rebuild (global): nightly (off-peak); per-user on-demand.
  - Export perf prune: hourly or daily depending on volume.
  - Backup verify: weekly summary; quarterly deep restore test per runbook above.

### Nightly GitHub Actions Trigger (optional)

- Workflow file: `.github/workflows/nightly-equity-rebuild.yml` triggers at 03:00 UTC daily.
- Configure repository secrets:
  - `CRON_EQUITY_REBUILD_URL` → deployed URL of `POST /api/cron/equity-rebuild`
  - `CRON_SECRET` → matches server env `CRON_SECRET`
- The workflow performs a POST with the secret header `x-cron-secret` and fails the job on non-2xx.

### Local/manual trigger

- Script: `scripts/cron-trigger.mjs`
- Requires env: `CRON_EQUITY_REBUILD_URL` and (optionally) `CRON_SECRET`.
- Example (PowerShell):

```powershell
node .\scripts\cron-trigger.mjs
```

## Backups & Retention
- Use managed Postgres with automated snapshots (daily, retain 7–30 days minimum).
- Weekly point-in-time recovery if supported (e.g., WAL archiving on Neon/Supabase).
- Store credentials/secrets in GitHub Environments; restrict production.
- Quarterly restore test runbook:
  1) Create a temporary database from latest snapshot.
  2) Run `prisma migrate status` to verify schema matches.
  3) Smoke-test core queries: count trades, recent equity rows, export a small CSV.
  4) Document duration and anomalies; file issues for gaps.
  5) Tear down the temporary database.

### Provider Examples
- Neon:
  - Enable PITR (point-in-time restore) in Neon console.
  - Create a branch at the desired point and obtain its connection string.
  - Run backup verification against that branch:
    - `DATABASE_URL=<branch-connection-string> npm run backup:verify`
  - Drop the branch when finished.
- Supabase:
  - Use the Backups section to restore to a new project or create a PITR fork.
  - Obtain the fork connection string from Project Settings → Database.
  - Run: `DATABASE_URL=<fork-connection-string> npm run backup:verify`
  - Remove the fork after verification.

## Production DB & Migrations
- Gate migrations in CI/CD: run `prisma migrate deploy` before releasing.
- Fail fast if drift is detected via `prisma migrate status` (optional step).
- Disallow running `prisma migrate dev` in production; use `deploy` only.
- Blue/green: deploy app pointing to the same DB after migrations applied.
- Connection management: use a pooler (pgbouncer) or provider defaults; set sensible `pool.max` in Prisma if needed.

See also: `docs/PRODUCTION_MIGRATION_STRATEGY.md` for a full runbook and rollback plan.

### Required Secrets (CI/Preview)
- DATABASE_URL (for CI tests/build if needed)
- VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID (for preview deploys)
