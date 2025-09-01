# mytradingjournal

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

### Recent Feature Highlights
| Area | What | Notes |
|------|------|-------|
| Goals | Configurable rolling window P/L (`ROLLING_WINDOW_PNL`) | Per-goal `windowDays`. |
| Exports | Persistent async multi-format exports | CSV, JSON, XLSX; filtering (dates, tags); retry/backoff; signed download tokens; basic UI page. |
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
```bash
set ENABLE_PDF_EXPORT=1   # PowerShell: $Env:ENABLE_PDF_EXPORT=1
```
3. (Optional) Set `APP_BASE_URL` if not running on default `http://localhost:3000`.

Returns: `application/pdf` snapshot of `/dashboard?print=1` (A4, print backgrounds). If disabled returns `501`.

### Export Queue (Async)
Feature flags: `ENABLE_EXPORT_QUEUE=1` (enable subsystem), `ENABLE_PERSIST_EXPORT=1` (use DB-backed persistent queue).

Endpoints: `/api/exports/jobs` (POST create, GET list), `/api/exports/jobs/:id`, `/api/exports/jobs/:id/download?token=...`

Capabilities:
- Multi-format: `csv`, `json`, `xlsx`
- Types: trades (with filters), goals, dailyPnl, tagPerformance
- Retry/backoff: up to 3 attempts (exponential 500ms base, capped)
- Signed download tokens (HMAC; enforced outside test env) with 10m expiry & one-time consumption
- Rate limiting: max 5 active jobs per user
- Metrics surfaced on `/api/health` (queued, processed, failed, retried, avgDurationMs)
- UI page at `/exports` for management & downloads
 - Trade column selection UI (choose subset of default columns prior to export)

See `docs/EXPORT_QUEUE.md` (update pending for new retry/token features).

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


## Deployment
Deploy to Vercel (recommended). Swap `DATABASE_URL` to managed Postgres (Neon / Supabase / PlanetScale etc.). Run `prisma migrate deploy` during build.
