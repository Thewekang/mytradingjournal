# Trading Journal Roadmap

A living roadmap outlining milestones, scope, and progress tracking to full-feature completion.

## 1. Product Overview
The Trading Journal is a multi-instrument, multi-user performance and behavior improvement platform for discretionary and system traders. It centralizes trade capture, tagging, analytics, risk governance, and goal tracking while remaining configurable (no hard‑coded instruments) and mobile friendly. Core value drivers:
- Accuracy: Structured capture reduces data loss & inconsistency.
- Insight: Advanced analytics (expectancy, drawdown, heatmaps) to surface strengths/weaknesses.
- Discipline: Risk guardrails, goals, and journaling prompts encourage process adherence.
- Portability: Responsive design & eventual PWA for quick on-the-go trade notes.
- Extensibility: Configurable instruments, tagging system, plug-in style analytics modules.

### Primary User Personas
1. Retail Futures / CFD / Crypto trader – needs fast input & position sizing context.
2. Swing / Equity trader – wants longer-term analytics + calendar + goal tracking.
3. Coach / Mentor (admin) – may review multiple user accounts (future role scope).

### Core Use Cases
| Use Case | Description | Frequency |
|----------|-------------|-----------|
| Log Trade | Create or update trade with entry, exit, size, tags, notes | High |
| Analyze Performance | View dashboards (equity curve, win rate, expectancy) | Daily |
| Review Day | Calendar view + daily P/L + lessons learned summary | Daily |
| Manage Instruments | Add/archive symbols with contract multipliers | Occasional |
| Set / Track Goals | Define monthly targets, monitor progress bars | Weekly |
| Export Records | Provide CSV/PDF for accountant / sharing | Monthly |
| Enforce Risk | System surfaces breach of daily loss / risk per trade | Intraday |

## 2. High-Level Architecture
Layered, modular, strongly typed (TypeScript everywhere):

```
┌──────────────────────────────────────────────┐
│ Presentation (Next.js App Router RSC + CSR)  │
│  - Server Components (data fetch)            │
│  - Client Components (forms, charts)         │
│  - Zustand (ephemeral UI state)              │
└───────────────▲──────────────────────────────┘
                │ (validated DTOs via Zod)
┌───────────────┴──────────────────────────────┐
│ API Layer / Route Handlers (REST/RPC hybrid) │
│  - Input Validation (Zod)                    │
│  - Auth (NextAuth middleware)                │
│  - Error Normalization                       │
└───────────────▲──────────────────────────────┘
                │ (Prisma service functions) 
┌───────────────┴──────────────────────────────┐
│ Domain & Services                            │
│  - TradeService / InstrumentService          │
│  - Analytics modules (pure functions)        │
│  - Risk Engine (threshold checks)            │
└───────────────▲──────────────────────────────┘
                │ (Prisma Client queries)
┌───────────────┴──────────────────────────────┐
│ Persistence (Postgres/SQLite dev)            │
│  - Prisma schema & migrations                │
│  - DB indexes (performance)                  │
└──────────────────────────────────────────────┘
```

## 3. Milestone Progress Snapshot (Aug 31 2025)

- Milestone 1 (Scaffold & Auth): COMPLETE
- Milestone 2 (CRUD + Soft Delete): COMPLETE
- Milestone 3 (Analytics Core): COMPLETE
- Milestone 4 (Advanced Analytics & Caching): COMPLETE
- Milestone 5 (Goals + Risk): COMPLETE (rolling window P/L goals, streak metrics, risk breach groundwork)
- Milestone 5a (Design System & A11y Polish): IN PROGRESS (tokens, tooltip, focus rings, error summary, theme + high contrast prefs added; light theme contrast tuning & component refactors pending)
- Milestone 6 (Exports & Reporting): CORE COMPLETE (multi-format exports, streaming CSV, analytics exports); experimental PDF + async queue shipped behind feature flags
- Milestone 7 (Advanced Goals & Analytics Enhancements): PARTIAL (most metrics delivered; composite & per-instrument goals pending)
- Milestone 8 (Performance & Offline): NOT STARTED (pre-aggregation & offline/PWA still pending)
- Milestone 9 (Observability & Ops): NOT STARTED (logging, Sentry/OTEL pending)

## 4. Upcoming (Planned)

Short-term (recently completed): Rolling window goals, analytics exports, multi-format streaming exports, theme preferences, error summary.
Remaining near-term (Design System / A11y polish):
- Light theme contrast adjustments & documentation
- Responsive container & spacing scale finalization
- Focus ring token documentation & usage examples
- Refactor remaining legacy UI (dashboard cards, goals panel) to primitives
- Add skip link & high-contrast validation audit page

Design System (Milestone 5a parallel sprint):
- Palette & tokens: BASE DONE (dark); light palette in progress
- Token map & Tailwind integration: PARTIAL (custom vars consumed directly)
- Icon set: lucide-react integrated
- Refactors: NavBar, trades page forms using Button/Card; remaining dashboard & goals pending
- Global layout constraints: pending
 - Motion guidelines: base prefers-reduced-motion override added; component-level tuning pending
 - Accessibility artifacts: checklist doc added (skip link, toast roles, arrow key tabs, dialog focus return, trade form validation, table caption; broader form a11y rollout pending)

Milestone 6 (Exports & Reporting): CORE COMPLETE
- [x] Multi-format trade export (CSV/JSON/XLSX) + column selection
- [x] Goal export (CSV/JSON/XLSX) + windowDays
- [x] Streaming CSV (memory efficient)
- [x] Analytics exports (daily P/L, tag performance) multi-format
- [x] Experimental PDF dashboard snapshot (feature-flagged)
- [x] Experimental async export queue (feature-flagged) generating CSV payloads
- [ ] Screenshot/image export of charts (canvas render)
- [ ] Localization/i18n groundwork (!)
- [ ] Queue persistence (DB) & JSON/XLSX support

Milestone 7 (Advanced Goals & Analytics Enhancements):
- (Most items delivered in Milestone 5). Remaining: composite metrics, per-instrument goals.

Milestone 8 (Performance & Offline):
- Pre-aggregated daily equity & P/L table (materialized view or scheduled job)
- Client-side offline capture queue + sync (PWA shell)

Milestone 9 (Observability & Ops):
- Structured logging & correlation IDs
- Sentry / OTEL instrumentation
- Automated backup verification task

Backlog / Stretch:
- Notification center & email summaries
- Multi-user coach view (admin reviewing mentee accounts)
- Strategy grouping & partial fills

Priority Ordering Rationale: finish risk robustness before expanding analytics footprint to keep correctness high; exports unlock user value early for accounting/sharing; then broaden goal sophistication and offline usability.

## 4a. Near-Term Next Steps (Actionable – Updated)
1. Light theme contrast matrix & token documentation (complete design system baseline).
2. Integrate Lighthouse (performance + a11y) & axe into CI workflow.
3. Harden experimental features: persist export queue (Prisma model + file/object storage) & promote PDF export (auth/session handling, retry logic).
4. Introduce structured logging + Sentry (or OTEL) instrumentation (foundation before scaling further).
5. Pre-aggregate daily equity / PnL table (performance baseline for large datasets).
6. Add screenshot / image export for charts (re-usable rendering util) and XLSX/JSON support in async queue.
7. Composite / per-instrument goals & advanced metrics (avg hold time, daily variance) filling remaining analytics gaps.
8. Offline capture/PWA shell (installable + local queue) after observability & performance groundwork.
9. Internationalization groundwork (routing & date/number locale service).

Rationale ordering focuses on: (a) Design & a11y polish for velocity; (b) Observability early for diagnosing future complexity; (c) Durability of long-running exports; (d) Performance pre-aggregation before data volume grows; (e) Feature breadth (advanced goals, offline, i18n) afterwards.


Supporting concerns: Logging, telemetry, caching, background jobs (future queue for heavy exports).

## 3. Domain Model Detail
| Entity | Purpose | Key Fields | Notes |
|--------|---------|-----------|-------|
| User | Account & preferences | email, role, settings FK | Role expansion later |
| JournalSettings | Risk & personalization | riskPerTradePct, baseCurrency | One-to-one with User |
| Instrument | Tradeable item | symbol, category, tickSize, contractMultiplier | Dynamic config |
| Trade | Executed position record | direction, entry/exit, quantity, fees, notes | Partial closure later (multi-leg stretch) |
| TradeTag | Classification taxonomy | label, color | User scoped + system defaults |
| TradeTagOnTrade | Join table | tradeId, tagId | Composite PK |
| Goal (future) | Target metrics | type, targetValue, period | For milestone 5 |

### Future Extensions
- Partial fills: Add a `TradeFill` table, computing realized/unrealized P/L.
- Multi-leg strategies: `Strategy` parent grouping multiple trades.
- Attachments: `TradeAttachment` (image URL, type).

## 4. Data Flow (Create Trade)
1. Client form (controlled inputs) -> local validation (Zod) for immediate feedback.
2. POST /api/trades – server validates again (defense in depth) & authorizes user.
3. Service layer applies risk checks (reject if > configured risk unless override policy defined).
4. Prisma persists Trade + tag connections in a transaction.
5. Response returns normalized DTO (no internal IDs leaked unnecessarily) + derived P/L if exit included.
6. Client updates local optimistic list or triggers revalidation (RSC fetch).

## 5. Validation & Error Strategy
- Zod schemas: `tradeCreateSchema`, `tradeUpdateSchema`, `instrumentSchema`, etc.
- Unified error object: `{ code, message, details? }` with HTTP mapping:
  - Validation -> 400
  - Auth -> 401
  - Permission -> 403
  - Not Found -> 404
  - Conflict (duplicate symbol) -> 409
  - Rate limit -> 429
  - Internal -> 500 (generic message, log detailed)

## 6. Security & Compliance
- Auth: NextAuth + Prisma adapter tokens (sessions persisted). HttpOnly secure cookies.
- Passwords: bcrypt (work factor tuned for deployment hardware).
- CSRF: Protected for state-changing non-JSON endpoints (if forms added); JSON fetch protected via same-site cookies + origin checks.
- Rate Limiting: Edge middleware (e.g. upstash/redis or in-memory fallback) for auth & trade mutations.
- Input Sanitization: Rely on parameterized Prisma queries; escape user-provided notes when rendering (React auto-escapes). Avoid `dangerouslySetInnerHTML`.
- Logging PII: Minimal; mask emails in error logs beyond debug level.
- Backups: Nightly automated DB snapshots (Milestone 9).

## 7. Performance & Scalability
| Layer | Strategy |
|-------|----------|
| DB | Proper indexes: (userId, entryAt), (instrumentId, entryAt), (userId, status) |
| API | Pagination (cursor) for large trade histories |
| Analytics | Pre-aggregate daily P/L table (materialized view or cron) later |
| Caching | Memory cache for last 30 days stats; revalidate on trade mutation |
| Frontend | RSC streaming for dashboard; code-splitting charts |
| Exports | Queue heavy PDF generation in background (stretch) |

## 8. Observability
- Structured logger (pino) wrapper (later) with request correlation ID.
- Sentry or OpenTelemetry instrumentation for API latency & error rate.
- Health endpoint returning DB connectivity & migration checksum.

## 9. Risk Engine (Planned)
Rules executed on trade create/update:
- Max risk % per trade (quantity * tickValue * stop distance vs account baseline) – Phase 2 enhancement.
- Daily max loss: Track aggregated realized P/L for day; block or warn subsequent loss-making trade.
- Consecutive losses threshold: produce coach prompt.
Engine returns an array of `RiskAlert { level: 'WARN' | 'BLOCK'; code; message }` consumed by UI.

## 10. Analytics Catalog (Planned Metrics)
| Category | Metric | Definition |
|----------|--------|-----------|
| Performance | Total P/L | Sum realized P/L |
| Performance | Win Rate | wins / closed trades |
| Efficiency | Expectancy | (AvgWin * WinRate) - (AvgLoss * (1-WinRate)) |
| Risk | Max Drawdown | Max peak-to-trough equity decline |
| Risk | Profit Factor | gross profit / gross loss |
| Behavior | Avg Hold Time | mean(exitAt - entryAt) |
| Behavior | Tag Performance | P/L aggregated per tag |
| Consistency | Daily Variance | variance of daily P/L |

## 11. UI/UX Principles
- Mobile-first adaptive layout; use CSS grid for dashboard cards.
- Consistent component tokens (radius, spacing scale). Avoid inline hex: use semantic classes.
- Keyboard accessible modals (focus trap) & skip navigation link.
- Color system with luminance contrast > WCAG AA for text on dark backgrounds.
- Loading states: skeletons for stats, shimmer for trade list.
- Empty states with guidance (“No trades yet — add your first trade”).
- Undo pattern (optimistic delete with 5s restore) later.

## 12. Config & Extensibility
- `lib/constants.ts` only for true global invariants (e.g. max tag count).
- DB-driven configuration: instruments, tags, risk settings.
- Feature flag harness (simple table or environment variable gate) for staged rollouts.
- Analytics plug-in: future pattern where each metric registers a calculator signature.

## 13. Deployment Strategy
- Dev: SQLite / local; Prod: Postgres managed (Neon / Supabase).
- Migration gating: CI runs `prisma migrate diff` against production shadow.
- Release process: PR -> preview deploy -> auto semantic version (optional) -> production.

## 14. Quality Gates Definition
| Gate | Success Criteria |
|------|------------------|
| Lint | 0 errors; warnings acceptable <5 (style only) |
| Types | No TS errors in CI |
| Unit Tests | ≥90% coverage lib/analytics by Milestone 4 |
| Integration | Core flows pass (login, create trade, view dashboard) |
| Performance | P95 trade create <300ms server time |
| Accessibility | 0 critical axe issues on key pages |

## 15. Risk Register
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Performance regressions with large trade sets | Slow dashboards | Pre-aggregation + indexes |
| Over-complex analytics early | Delayed delivery | Incremental metric rollout |
| Vendor lock (Auth / DB) | Migration difficulty | Keep abstraction boundaries (services) |
| Data loss | Critical | Automated backups + restore test |
| Scope creep (stretch features) | Timeline slip | Roadmap discipline & decision log |

## 16. Non-Goals (Current Phase)
- Real-time streaming of live positions.
- Broker API auto-import (future possible integration).
- Portfolio optimization / ML signal generation.
- Multi-tenant org hierarchy beyond simple user accounts.

## 17. Success Metrics (Product KPIs)
| KPI | Target After Launch |
|-----|---------------------|
| Daily Active Users / MAU | >35% |
| Average Trades Logged per Active User / Week | ≥10 |
| Retention (30-day) | ≥60% |
| Goal Completion Rate / Month | ≥50% users set goals & update |
| Time to Log Trade (median) | <20s (manual entry) |

## 18. Implementation Sequencing Rationale
Auth precedes CRUD to ensure ownership enforced. CRUD before analytics to guarantee real dataset. Analytics before goals/risk to leverage metrics engine. Exports after stable analytics. Performance & QA iteratively layered once feature surface is stable.

---

## Legend
- [x] Done
- [~] In Progress / Partial
- [ ] Not Started
- (!) Needs Decision

## Milestone 1 – Core Scaffold (Week 1)
Goal: Functional skeleton with DB schema, build/test pipeline.
- [x] Tech stack selection & initialization (Next.js 15, TS, Prisma, Tailwind 4)
- [x] Database schema (Users, Instruments, Trades, Tags, Settings)
- [x] Constants & analytics helpers
- [x] Initial UI scaffolding (Navbar, dashboard placeholders)
- [x] Build, lint, unit test setup (ESLint flat, Vitest)
- [x] Upgrade deps to latest majors
- [x] Tailwind v4 migration
- [x] Roadmap & documentation

Exit Criteria: App builds & deploys; can compute basic stats from mock data.

## Milestone 2 – Authentication & User Context (Week 2)
Goal: Secure multi-user separation.
- [x] Integrate NextAuth (Email/password via Prisma adapter; OAuth later)
- [x] Middleware for protected routes (basic JWT token check)
- [x] Seed default `JournalSettings` + sample instruments & tags per new user automatically (middleware seeding)
- [x] Account menu + sign in/out UI (basic)
- [x] Basic role concept (admin vs user)

Exit Criteria: Authenticated users have isolated data; anonymous user redirected.

## Milestone 3 – Trade CRUD & Instrument Management (Week 2–3)
Goal: Core journal functionality.
- [x] API route handlers (REST) implemented:
  - [x] Trades (create/list/update/delete)
  - [x] Instruments (list/add/archive)
  - [x] Tags (create/list)
  - [x] Settings (read/update)
- [x] Zod validation & error shaping (core schemas + error helpers)
- [~] Prisma service abstraction (transactions present; error mapping & stricter typing pending)
- [x] Trade form (basic inline form; upgrade to drawer/modal later)
- [x] Tag selector with color chips & search (initial multi-select + chips)
- [x] List + filters (instrument, date range, direction, status, tags, text search)
- [~] Pagination / infinite scroll (cursor API + load more UI; infinite scroll pending) (!)
 - [x] Pagination / infinite scroll (cursor + load more + intersection observer auto-load)
- [x] Soft delete strategy for trades (implemented `deletedAt`, status set to CANCELLED on delete)
  - Future: add undo window + audit log table if needed.
  
Follow-ups (post-M3 polish):
- Add automated seeding hook on new user registration (currently only manual seed script)
- Extend OpenAPI spec to include instruments, tags, settings endpoints & documented filters
- Strengthen service layer error translation (Prisma known error codes -> 409/400)
- Replace `any` in `trade-service` with precise Prisma types
 - Add trade restore (undo) endpoint (DONE)
 - Background purge script & undo window constant (DONE)

Exit Criteria: User can record, edit, close, tag, and browse trades with filters.

## Milestone 4 – Analytics & Visualization (Week 3–4)
Goal: Insightful performance dashboards.
- [x] Equity curve (cumulative P/L)
- [x] Daily calendar heatmap (backend + initial UI; visual polish later)
- [x] Monthly performance bar chart
- [x] Win/Loss distribution (donut + counts)
- [x] Max drawdown calculation
- [x] Tag performance aggregation (per-tag P/L table)
- [x] Avg win vs avg loss ratio widget
- [x] Consecutive losses streak metrics (current & max)
- [x] Profit factor & expectancy (summary endpoint)
- [x] Data caching / memoization layer (per-user TTL + invalidation)

Remaining (post-M4 polish / future analytics):
- [ ] Avg hold time metric
- [ ] Daily variance metric

Exit Criteria: Dashboard reflects real trade data with performant queries.

## Milestone 5 – Goals, Risk & Journaling (Week 4–5)
Goal: Behavioral improvement features.
- [ ] Goals entity (monthly P/L, trade count, win rate targets)
- [ ] Streak tracking (wins/losses)
- [ ] Risk guardrails (daily loss % vs settings; UI alert)
- [ ] Notes / lessons fields emphasized in UI
- [ ] Quick templates / reason presets

Exit Criteria: User sees progress vs goals & receives risk alerts.

## Milestone 5a – Visual Design System & Full Styling (Parallel / Week 5–6)
Goal: Cohesive, modern, accessible UI foundation enabling rapid feature iteration & brand scalability.
- [ ] Define design tokens (color, spacing, typography scale, z-index, radii, shadows)
- [ ] Implement theme layer (CSS variables + Tailwind config) with light & dark modes
- [ ] Select & integrate icon library (Lucide or Heroicons) with tree-shaking; create naming convention
- [ ] Build primitive components (Button, IconButton, Card, Surface, Badge, Tooltip, Dialog, Toast, Alert Banner, Tabs, Table skeleton) with a11y patterns
- [ ] Refactor existing pages to primitives (dashboard cards, goals panel, risk panel, nav)
- [ ] Add responsive grid & container utilities (sm/md/lg/xl breakpoints documented)
- [ ] Establish motion & interaction guidelines (focus ring style, hover/active, reduced motion)
- [ ] Contrast & accessibility audit (ensure WCAG AA for text & interactive elements)
- [ ] Document usage in `docs/design-system.md`
- [ ] (Optional) Visual regression baseline (Playwright + percy-like snapshot abstraction)

Exit Criteria: All core surfaces (Navbar, Dashboard, Goals, Risk panels, Forms) use unified primitives; theme switch ready; accessibility checks pass (no critical issues).

## Milestone 6 – Exports & Reporting (Week 5–6)
Goal: Shareable and archived records.
- [ ] CSV export (filtered trades)
- [ ] PDF report (summary stats + charts + trade table)
- [ ] Screenshot or image export of charts (canvas rendering)
- [ ] Localization/i18n groundwork (!)

Exit Criteria: User downloads at least CSV & PDF successfully.

## Milestone 7 – Settings & Personalization (Week 6)
Goal: User customization.
- [ ] Settings page UI (risk %, timezone, base currency, theme)
- [ ] Currency conversion support (FX rates strategy) (!)
- [ ] Theme toggle (light/dark) with system preference
- [ ] Notification preferences (future) (!)

Exit Criteria: User updates settings and UI reflects changes immediately.

## Milestone 8 – Performance & QA (Ongoing polish)
Goal: Reliability, speed, correctness.
- [ ] Add integration tests (Playwright) for auth + trade flow
- [ ] Add more unit tests (analytics edge cases: shorts, partial exits)
- [ ] Introduce caching (React cache / in-memory LRU for heavy stats)
- [ ] Optimize DB queries & add indexes (drawdown, date filters)
- [ ] Add monitoring (Sentry / OpenTelemetry) (!)
- [ ] Accessibility audit (ARIA labels, focus states)

Exit Criteria: <200ms P95 API responses for core endpoints; core flows test-covered.

## Milestone 9 – Deployment & Ops
Goal: Production readiness.
- [ ] CI pipeline (lint, type-check, tests, build) – GitHub Actions
- [ ] Preview deployments on PRs
- [ ] Production Postgres & migration strategy
- [ ] Backup & retention policy docs (!)
- [ ] Rate limiting / security headers
- [ ] Dockerfile (optional) (!)

Exit Criteria: Automated pipeline; stable prod environment.

## Milestone 10 – Nice-to-Haves / Stretch
- [ ] AI tagging suggestions (determine reason/lesson) (!)
- [ ] Multi-leg trade grouping
- [ ] Trade images / chart snapshots upload
- [ ] Mobile PWA install support
- [ ] Offline draft mode

## Cross-Cutting Concerns
| Area | Strategy |
|------|----------|
| Validation | Zod schemas shared client/server |
| Error Handling | Unified error envelope {code,message,details} |
| Logging | Structured (console + optional transport) |
| Security | Auth tokens httpOnly; CSRF for sensitive POST if needed |
| Internationalization | Plan placeholders; currency formatting via Intl API |
| Accessibility | Semantic HTML, keyboard navigable modals |
| Theming | CSS vars & Tailwind tokens |

## Seeding Plan (Added)
Purpose: Ensure a new environment has baseline data for faster evaluation & development.

Seed Script Responsibilities:
- Create an initial user (if none) with hashed password (env-driven to avoid committing secrets).
- Insert default `JournalSettings` (baseCurrency=USD, riskPerTradePct=1, maxDailyLossPct=3, timezone=UTC).
- Insert a small curated instrument set (e.g. ES, NQ, GC, BTCUSD, EURUSD) idempotently.
- Insert a handful of starter tags ("Setup:A", "Emotion:FOMO", "Playbook:Breakout").

Implementation Outline:
1. `scripts/seed.mts` (ESM) loads `dotenv`, instantiates Prisma.
2. Reads SEED_USER_EMAIL / SEED_USER_PASSWORD from `.env` (abort if missing in production).
3. Upserts user & settings, then `upsert` each instrument and tag.
4. Guard rails: refuse to run if `NODE_ENV=production` without `ALLOW_SEED_PROD=true`.
5. Add npm script: `seed:dev`.

Future Enhancement:
- Extend with demo trades dataset (flag controlled) for visualizing analytics quickly.
- Support partial seeding (arguments: `--instruments`, `--tags`, `--demo-trades`).


## Current Status Snapshot
Milestones 1–3 completed (CRUD, auth, soft delete, pagination with infinite scroll). Milestone 4 analytics implementation substantially complete (core metrics + caching). Remaining near-term focus: service typing refinement, accessibility polish, and preparation for Goals/Risk (Milestone 5).

## Decision Backlog
| Topic | Question | Needed By |
|-------|----------|-----------|
| Auth Adapter | Use Prisma adapter vs custom credentials? | Before M2 start |
| Pagination | Offset vs cursor (prisma) | Before Trade list impl |
| Soft Delete | Keep historical analytics? | Before trade delete release |
| Currency FX | External API vs manual input | Before Settings currency conversion |
| PDF Generation | Server (pdf-lib) vs client (react-pdf) | Before Milestone 6 |

## How to Update This File
Add progress marks ([x]/[~]) via PRs; keep decisions logged. Treat unchecked (!) items as requiring an explicit decision issue.

---
_Last updated: 2025-08-31 (post rolling goals & tooltip)_
