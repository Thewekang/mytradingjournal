# mytradingjournal
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
| Exports | Trades & Goals multi-format | CSV (streaming), JSON, XLSX; column selection via repeated `col=` params. |
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

### Experimental Export Queue
Feature flag: `ENABLE_EXPORT_QUEUE=1`

Provides async job endpoints (`/api/exports/jobs...`) with in-memory queue (non-persistent) for offloading larger exports. See `docs/EXPORT_QUEUE.md`.

## Recently Completed
- Rolling window P/L goals with tests.
- Multi-format trade & goal exports + tests (CSV/JSON/XLSX).
- Streaming CSV responses (memory efficient for large datasets).
- Accessible form error summary pattern.
- Auth route refactor for type safety.

See detailed milestones / upcoming polish in `docs/ROADMAP.md`.

AI contributor guidance: see `docs/AI_CONTEXT.md`.

## Deployment
Deploy to Vercel (recommended). Swap `DATABASE_URL` to managed Postgres (Neon / Supabase / PlanetScale etc.). Run `prisma migrate deploy` during build.
