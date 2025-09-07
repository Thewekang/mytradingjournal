# mytradingjournal

For recent changes & migration notes see `CHANGELOG.md`.

<!-- Added: deprecated flag guard -->
Run `npm run guard:flags` to ensure no deprecated export flags remain in the codebase (CI can adopt this).

| Pipeline | Overall | Unit | Accessibility |
|----------|---------|------|---------------|
| ![CI](https://github.com/Thewekang/mytradingjournal/actions/workflows/ci.yml/badge.svg) | ![Coverage](https://codecov.io/gh/Thewekang/mytradingjournal/branch/main/graph/badge.svg) | ![Unit Coverage](https://codecov.io/gh/Thewekang/mytradingjournal/branch/main/graph/badge.svg?flag=unit) | ![Accessibility Coverage](https://codecov.io/gh/Thewekang/mytradingjournal/branch/main/graph/badge.svg?flag=accessibility) |

| CodeQL | Snyk | Security Audit | Audit Fix |
|--------|------|----------------|-----------|
| ![CodeQL](https://github.com/Thewekang/mytradingjournal/actions/workflows/codeql.yml/badge.svg) | ![Snyk](https://github.com/Thewekang/mytradingjournal/actions/workflows/snyk.yml/badge.svg) | ![Security Audit](https://github.com/Thewekang/mytradingjournal/actions/workflows/security-audit.yml/badge.svg) | ![Audit Fix](https://github.com/Thewekang/mytradingjournal/actions/workflows/audit-fix.yml/badge.svg) |
Personal trading journal app (Next.js 15 + Prisma + NextAuth + Tailwind, exports, a11y tooling)

Multi-instrument trading journal & analytics platform.

## Stack Rationale
- Next.js App Router: SSR/ISR, API routes, edge-ready.
- TypeScript: safety.
- Prisma: DB abstraction (starts with SQLite, easily migrate to Postgres/MySQL).
- NextAuth: secure auth with credentials / OAuth.
- TailwindCSS + utility components: rapid, consistent dark UI.
- Recharts: charts for equity curve & performance.
- Zod: runtime validation.
- Zustand: lightweight client state (filters, theming preferences if needed).

## Dev Setup
1. Copy `.env.example` to `.env` and adjust secrets.
2. Install deps:
```bash
npm install
```
3. Generate & migrate DB:
```bash
npx prisma migrate dev --name init
```
4. Run dev server:
```bash
npm run dev
```

### Seeding (optional)
Populate a baseline user, settings, instruments, tags, and sample monthly goals.

PowerShell (Windows):
```powershell
# Optional: override defaults (non‑prod falls back to admin@example.com / admin123)
$Env:SEED_USER_EMAIL='you@example.com'
$Env:SEED_USER_PASSWORD='yourpassword'

# Run the seed (uses .env.local)
npm run seed
```

Notes:
- In production, seeding is blocked unless you set `ALLOW_SEED_PROD=true`.
- Defaults match schema: baseCurrency=USD, riskPerTradePct=1, maxDailyLossPct=3, timezone=UTC, initialEquity=100000.
- Idempotent upserts for instruments/tags; monthly goals are created only when none exist.

### Recent Feature Highlights
| Area | What | Notes |
|------|------|-------|
| Goals | Configurable rolling window P/L (`ROLLING_WINDOW_PNL`) | Per-goal `windowDays`. |
| Exports | Persistent async multi-format exports | CSV, JSON, XLSX; filtering (dates, tags); retry/backoff; signed download tokens; streaming CSV path; basic UI page; performance endpoint. |
| Accessibility | Form-level error summary component | Focus-first summary listing field errors. |
| Risk | Breach logging groundwork | `RiskBreachLog` table added. |
| Auth | Cleaner route exports | `authOptions` moved to `lib/auth-options.ts`. |
| Settings | Theme + High Contrast prefs | Added `theme` (dark/light) & `highContrast` flags. |

### Soft Delete & Purge
Trades are soft deleted (sets `deletedAt`, status -> CANCELLED). They can be restored via `POST /api/trades/:id/restore` within the undo window (5 minutes by default). A purge script removes older soft-deleted rows:

```bash
npm run purge:trades
```

Open http://localhost:3000

## Design Principles
- Config-driven (no magic literals): see `lib/constants.ts`, database-driven instruments & tags.
- Separation of concerns: analytics in `lib/analytics.ts`.
- Accessible & responsive: mobile-first layout, semantic HTML.
- Dark theme default, theming extendable.

## Export Usage

Trades example:
`/api/trades/export?format=csv&col=id&col=direction&col=entryPrice`

Goals example:
`/api/goals/export?format=json&col=id&col=type&col=windowDays`

Formats: `csv` (default, streamed), `json`, `xlsx`.

Columns: Omit `col` params for defaults; otherwise include multiple `col=` query params (validated internally).

### Experimental PDF Export
Endpoint: `/api/dashboard/export/pdf` (feature-flagged, disabled by default).

Enable:
1. Install Playwright (dev only):
```bash
npm i -D playwright
npx playwright install chromium
```
2. Set environment variable:
PowerShell:
```powershell
$Env:ENABLE_PDF_EXPORT=1
```
CMD:
```bat
set ENABLE_PDF_EXPORT=1
```
bash/zsh:
```bash
export ENABLE_PDF_EXPORT=1
```
3. (Optional) Set `APP_BASE_URL` if not running on default `http://localhost:3000`.

Returns: `application/pdf` snapshot of `/reports/dashboard?print=1` (A4, print backgrounds). If disabled returns `501`.

Filters (applied to the print page and forwarded by the PDF endpoint):
- `from` – YYYY-MM-DD (inclusive)
- `to` – YYYY-MM-DD (inclusive)
- `tagId` – can be repeated to include multiple tags

Examples:
- Print page in browser:
	- `/reports/dashboard?from=2025-01-01&to=2025-03-31&tagId=trend&tagId=risk1`
- PDF endpoint (PowerShell):
```powershell
$Env:ENABLE_PDF_EXPORT=1
Invoke-WebRequest -Uri "http://localhost:3000/api/dashboard/export/pdf?from=2025-01-01&to=2025-03-31&tagId=trend&tagId=risk1" -UseBasicParsing -OutFile report.pdf
```
Note: You can also set `APP_BASE_URL` when the app isn’t running on the default host/port.

#### Visual Regression (optional, dev)
- Run snapshots: `npm run test:visual`
- Update baselines: `npm run test:visual:update`
Baselines are stored under `tests/visual/__snapshots__/`.

### FX Conversion (feature-flagged)
Daily ECB rates via Frankfurter with on-the-fly conversion. Disabled by default.

Enable in PowerShell:

```powershell
$Env:ENABLE_FX_CONVERSION=1
```

Backfill rates with the guarded cron endpoint (admin-only or shared secret header `x-cron-secret`):

```powershell
# Default: last 90 days, base USD -> quote per instrument currency when converting
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/fx-backfill" -Method Post -Headers @{ 'x-cron-secret' = 'YOUR_SECRET' } -ContentType 'application/json' -Body '{"base":"USD","quote":"EUR","from":"2025-01-01","to":"2025-03-31"}'
```

Notes:
- DB-first lookup with in-memory cache; falls back to previous business day (up to 5 days) to handle weekends/holidays.
- Conversion uses the trade’s exit date; base currency comes from user settings (`JournalSettings.baseCurrency`).
- Keep the flag off until your backfill covers your trading history to avoid partial conversions.

### Export Queue (Async)
Feature flag: `ENABLE_EXPORTS=1` (enable persistent export subsystem).

Endpoints: `/api/exports/jobs` (POST create, GET list), `/api/exports/jobs/:id`, `/api/exports/jobs/:id/download?token=...`, `/api/exports/jobs/perf`

Capabilities:
- Multi-format: `csv`, `json`, `xlsx`
- Types: trades (with filters), goals, dailyPnl, tagPerformance
- Retry/backoff: up to 3 attempts (exponential 500ms base, capped)
- Signed download tokens (HMAC; enforced outside test env) with 10m expiry & one-time consumption
 - Refresh: `POST /api/exports/jobs/:id/token` to regenerate token after expiry (completed jobs only)
- Rate limiting: max 5 active jobs per user
- Metrics surfaced on `/api/health` (queued, processed, failed, retried, avgDurationMs)
- Performance samples endpoint: `/api/exports/jobs/perf` (recent timings)
- Streaming CSV path for large datasets with soft memory limit fail-fast and footer `# streamed_rows=<n>` when forced
- UI page at `/exports` for management & downloads
 - Trade column selection UI (choose subset of default columns prior to export)

See `docs/EXPORT_QUEUE.md` for architecture & workflow details.

### Equity Validation & Rebuild
- Validate vs recompute: `GET /api/equity/validate`
- Rebuild + validate: `POST /api/equity/validate`
- Range fetch: `GET /api/equity/range`
- Cron endpoints (guarded by `x-cron-secret` or admin session):
	- `POST /api/cron/equity-rebuild`
	- `POST /api/cron/equity-rebuild-user`
	- `POST /api/cron/export-perf-prune`
	- `POST /api/cron/fx-backfill`
	- `GET /api/cron/backup-verify` — returns counts and a small recent trades sample; useful to confirm backups/restores

## Recently Completed
- Persistent async export queue (DB) + retry/backoff & metrics.
- Signed download tokens & rate limit for export jobs.
- Multi-format trade, goal, analytics exports (CSV/JSON/XLSX) + filters.
- Exports UI page (create, monitor, download).
- Health endpoint metrics enrichment.
- Rolling window P/L goals with tests.
- Accessible form error summary pattern.
- Auth route refactor for type safety.

See detailed milestones / upcoming polish in `docs/ROADMAP.md`.

AI contributor guidance: see `docs/AI_CONTEXT.md`.

## Testing & Quality Gates
Commands:
```bash
# Full test suite
npm test
# Accessibility-only
npm run test:a11y
# Coverage (unit + integration)
npm run test:coverage
# Accessibility with coverage
npm run test:coverage:a11y
# Lint & type check
npm run lint && npm run type-check
```
Coverage thresholds (fail CI if below): Lines/Statements 80%, Functions 80%, Branches 70%.
Contrast audit: `npm run design:audit` (runs separately in CI).
Selective audit scope: CI derives affected pages via `scripts/derive-audit-pages.mjs` comparing changed files to `scripts/changed-files-audit-map.json`; sets `AUDIT_PAGES` so Lighthouse / axe / motion audits only hit impacted routes (unless broad token/UI changes or `FORCE_ALL=1`). Use `BASE_REF` to override default `origin/main` or `FORCE_ALL=1` to run full set locally.

Codecov: PRs must maintain >=80% patch coverage (1% leniency). Config in `codecov.yml`.

Nightly build runs with relaxed coverage (env `RELAXED_COVERAGE=1`) to surface drift without blocking daily work.

### Coverage Baseline & Drift
Maintain a baseline file (`coverage-baseline.json`) on `main`:
```bash
npm run test:coverage
npm run coverage:baseline
git add coverage-baseline.json && git commit -m "chore: update coverage baseline"
```
CI compares current coverage to baseline (max 2% drop). Override sensitivity with env `COVERAGE_DROP_MAX`.

Nightly workflow will auto-raise the baseline when higher coverage is achieved (never lowers it).

### Automated Dependency Maintenance
Weekly workflow (`deps.yml`) attempts safe (same-major) updates and opens a PR `chore/deps-YYYYMMDD` if changes pass type check & tests.
PRs are auto-labeled `dependencies` and `automation`.

### Security Audits
Weekly security audit (`security-audit.yml`) runs `npm audit` (level=moderate) and fails on any high/critical issues.
Automated audit fix PR (`audit-fix.yml`) attempts non-breaking then forced fixes and labels PR `security,automation`.
Snyk scanning (`snyk.yml`) runs weekly with high severity threshold and uploads SARIF to GitHub code scanning (requires `SNYK_TOKEN`).
CodeQL static analysis (`codeql.yml`) scans JS/TS on pushes, PRs, and weekly schedule.
Stale security PRs auto-managed (`stale-security-prs.yml`): security-labeled PRs go stale after 21 days, close after 28 unless labeled `keep-open`.
Published dashboard (weekly):
- JSON: https://thewekang.github.io/mytradingjournal/security-dashboard/security-dashboard.json
- HTML viewer + trends: https://thewekang.github.io/mytradingjournal/security-dashboard/

### Optional Webhook Notifications
Set `COVERAGE_WEBHOOK_URL` secret (Slack incoming webhook or generic) to receive messages after coverage jobs.

## Observability & Request Correlation
- All API responses include an `x-request-id` header generated by middleware. If you pass your own `x-request-id` on the inbound request, it will be echoed back.
- Structured logs use this request id (`reqId`) in child logger context, making it easy to trace a flow end-to-end across API handlers, services, and workers.
- Health endpoint: `/api/health` exposes a lightweight snapshot including export queue metrics when `ENABLE_EXPORTS=1`.


## Deployment
Deploy to Vercel (recommended). Swap `DATABASE_URL` to managed Postgres (Neon / Supabase / PlanetScale etc.). Run `prisma migrate deploy` during build.
