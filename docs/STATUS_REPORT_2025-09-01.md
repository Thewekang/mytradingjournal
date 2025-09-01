# Project Status Report – Sep 1 2025

## Executive Summary
Export & reporting milestone significantly advanced: persistent async export queue (DB-backed) now supports multi-format (CSV/JSON/XLSX) generation with retry/backoff, signed download tokens, filtering (date range, tags) for trade exports, per-user active job rate limiting, health metrics, and a basic UI management page. All 41 test files (59 tests) passing. Design system & a11y polish (Milestone 5a) remains in progress; observability and streaming performance work next.

## Recently Completed (Since Aug 31)
- Added `ExportJob` retry fields (`attemptCount`, `nextAttemptAt`) + migration.
- Implemented exponential backoff retry (max 3 attempts) in persistent worker.
- Added signed HMAC download token (enforced outside test env) + token tests.
- Added rate limiting (max active queued/running jobs per user) in POST /api/exports/jobs.
- Extended builder to accept trade filters (dateFrom, dateTo, tagIds, instrument, status, direction).
- Added health endpoint export metrics (mode, queued, processed, failed, retried, avgDurationMs).
- Introduced exports UI page (create jobs, view status, download when ready).
- Added download token + rate limit test suite.
- Added in-memory queue parity field `attemptCount`.
- Updated roadmap & documentation to reflect new state.

## Current Coverage Snapshot (Delta Focus)
| Area | Status | Delta |
|------|--------|-------|
| Exports | CORE COMPLETE | Added retries, tokens, UI, filtering |
| Observability | PARTIAL | Basic metrics only; structured logging baseline present |
| Design System | IN PROGRESS | Contrast & light theme adjustments outstanding |
| Accessibility | STRONG BASE | Need to eliminate act() warnings in NavBar test |
| Performance | BASELINE | Streaming CSV & pre-aggregation pending |

## Metrics & Quality
- Tests: 59/59 passing (41 files).
- Type Check: Clean (no TS errors).
- Lint: No new errors introduced by export enhancements.
- Export Worker: Average duration metric collected (rolling last 20 samples).

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Large export memory usage | OOM risk for very large trade sets | Implement streaming path & row threshold guard next sprint |
| Download tokens non-expiring | Potential leak reuse | Plan: add expiry (timestamp signed) + optional one-time consumption |
| Retry logic treats all failures equally | Repeated retries for permanent errors | Enhance with error classification (transient vs permanent) |
| UI lacks column selection | User friction for tailored reports | Implement column picker & pass selected headers param |

## Next 7 Priority Actions
1. Column selection UI + API param (`columns[]`) for trade exports.
2. Streaming CSV implementation when row count > threshold (e.g. 10k) using incremental generator.
3. Token hardening: add `expiresAt` signature & reject stale tokens; optionally one-time use.
4. Structured logging enrichment (request ID propagation, error stack redaction) + Sentry integration.
5. Address React act() warnings in NavBar accessibility test (wrap updates / use testing utilities).
6. Pre-aggregated daily equity/PnL table (foundation for faster analytics & larger datasets).
7. Add average hold time & daily variance metrics (advance Milestone 7).

## Follow-On (Secondary)
- Screenshot/image chart export (prerequisite for richer PDF).
- Composite/per-instrument goals.
- Offline capture / PWA shell.
- Internationalization groundwork (date/number formatting provider + language switch infra).

## Decision Log Updates
| Topic | Decision | Date |
|-------|----------|------|
| Export security | Use HMAC token (32 hex chars) with plan to add expiry next | 2025-09-01 |
| Retry policy | Exponential (500ms * 2^attempt) capped at 30s, max 3 tries | 2025-09-01 |
| Rate limit | Max 5 active (queued+running) export jobs per user | 2025-09-01 |

## Open Decisions
| Topic | Question | Target |
|-------|----------|--------|
| Streaming threshold | What row count triggers streaming? | Before implementation |
| Token expiry window | 10 min vs 1 hour? | Prior to expiry feature |
| Storage strategy | Keep Base64 in DB vs object storage for large XLSX | After streaming path |

## Action Items
| # | Action | Owner | Target |
|---|--------|-------|--------|
| 1 | Implement column selection UI & API support | dev | Short-term |
| 2 | Add streaming CSV path | dev | Short-term |
| 3 | Add token expiry (HMAC of id+ts) | dev | Short-term |
| 4 | Enrich logging & add Sentry | dev | Short-term |
| 5 | Fix act() warnings in NavBar test | dev | Short-term |
| 6 | Pre-aggregate daily equity table | dev | Mid-term |
| 7 | Add avg hold time & daily variance metrics | dev | Mid-term |

## Summary
Exports subsystem matured from experimental to production-ready foundation (retries, security, metrics, UI). Focus now shifts to usability (column selection), scalability (streaming & pre-aggregation), and observability (instrumentation) while continuing design & accessibility polish.

---
_Generated: 2025-09-01_# Project Status Report – Sept 1 2025

_This report captures current phase transition (Phase 2 → Phase 3) and forward execution path._

## 1. Current Phase
Entering **Phase 3: Design System Completion + Export/Observability/Performance Hardening**.

## 2. Delivered Foundations (Active & Verified)
- Auth / Session (NextAuth) with typed `SessionUser` abstraction
- Core CRUD: Trades, Instruments (archive), Tags, Settings; soft delete + restore
- Analytics core: equity curve, monthly bars, win/loss donut, drawdown, expectancy, profit factor, tag performance, streaks
- Goals: standard + rolling window P/L variant (windowDays)
- Risk Engine v1: per-trade risk %, daily loss, streak breach logging + banner
- Exports: Trades & Goals CSV/JSON/XLSX (column selection), analytics exports, streaming CSV, experimental PDF + async queue (flagged)
- Accessibility: axe-based component/page tests (nav bar, alerts, charts, form error summary, risk banner); polyfills for charts; reduced critical issues to 0
- Quality Gates: Coverage thresholds + baseline drift guard, nightly relaxed run, Codecov integration
- Security & Maintenance Automation: npm audit gating, audit-fix PRs, Snyk SARIF, CodeQL, stale security PR workflow, dependency update workflow
- Security Dashboard: JSON + HTML viewer with historical trend sparklines

## 3. Design & A11y Status
- Dark theme solid; light theme contrast adjustments pending
- Focus ring tokens & utility class in place
- Remaining: skip link, finalize primitive refactors (dashboard cards, goals panel), Lighthouse & contrast matrix CI step

## 4. Outstanding Work to Reach “Complete Workable App”
| Category | Items Remaining |
|----------|-----------------|
| Design System | Light theme contrast finalization; skip link; remaining primitive refactors; motion guidelines doc |
| Exports | Persist queue (DB); stabilize PDF (retry & auth); chart image export (PNG/SVG) |
| Observability | Structured logging (pino) + request ID; Sentry/OTEL integration; health/diagnostics endpoint |
| Performance | Pre-aggregated daily equity/PnL table; benchmarking & swap queries |
| Goals/Analytics | Composite goals; per-instrument goals; avg hold time; daily variance |
| Offline/PWA | Manifest, service worker, offline trade draft queue |
| Internationalization | Locale middleware skeleton; date/number formatting helpers |
| A11y Tail | Lighthouse CI; contrast token audit script; keyboard e2e smoke tests |

## 5. Immediate 2‑Week Sprint (Actionable)
1. Light theme contrast + skip link + finalize primitives
2. Logging + Sentry + health endpoint
3. Persistent export queue (CSV/PDF) & promote PDF from experimental
4. Pre-aggregation (DailyEquity) + analytics read path toggle
5. Composite & per-instrument goals (schema + service + tests)

## 6. Sequenced Mini-Sprints (After Immediate)
1. Chart image export + queue integration
2. Avg hold time & daily variance metrics
3. PWA & offline capture
4. Internationalization scaffold
5. Lighthouse + contrast audit automation
6. Playwright smoke + keyboard regression tests

## 7. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Light theme regressions | A11y failure | Automated contrast audit script; CI gate |
| Export queue persistence complexity | Delivery delay | Start with single table & base64 payload, iterate |
| Pre-aggregation correctness drift | Data mismatch | Validation script comparing live vs aggregated snapshot |
| Scope creep (i18n vs offline) | Timeline slip | Freeze i18n to scaffold until offline shipped |
| Lack of error visibility | Hidden failures | Implement Sentry & structured logging early |

## 8. KPIs & Targets
| KPI | Current | Target (Pre-Launch) |
|-----|---------|---------------------|
| Coverage (lines) | ~85% (gated) | ≥85% sustained |
| Axe critical issues | 0 (tested surfaces) | 0 across key pages |
| Export job success | In-memory (manual) | ≥99% persisted + retry |
| P95 analytics response | Not benchmarked | <300ms with pre-aggregation |
| Error capture rate | Minimal logging | 100% server errors traced |

## 9. Definition of “Complete Workable App” Exit (Snapshot)
- Unified design system (both themes AA compliant)
- Stable persistent exports (CSV, PDF) + queue & monitoring
- Observability (logs, tracing, error capture, health endpoint)
- Pre-aggregated analytics for performance scale
- Advanced goals & remaining metrics delivered
- Offline trade capture (baseline) + installable PWA
- i18n foundation (single locale active)
- A11y: 0 serious/critical, Lighthouse ≥95 a11y score

## 10. Next Files / Schema Drafts (Planned)
- `prisma/schema.prisma`: add `ExportJob` & `DailyEquity` models (to be introduced when implementing persistent queue & pre-aggregation)

## 11. Quick Run Instructions
```bash
npm install
npx prisma migrate dev
npm run dev
```
App accessible at http://localhost:3000 (dashboard, trades, goals, settings routes). Authentication flow enabled.

## 12. Notes
This document complements `ROADMAP.md`; it reflects current operational focus and supersedes dated status elements there until roadmap is refreshed.
