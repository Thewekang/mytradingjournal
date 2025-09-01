# Project Status Report – Aug 31 2025

## Executive Summary
Core app (auth, CRUD, analytics, goals, risk engine) is stable with all existing tests passing. Recent deliveries: accessible tooltip component, contrast & surface tokens, unified focus ring tokens, configurable rolling window P/L goals. Immediate focus should shift to adding tests for new goal variants, export enhancements (column selection + JSON), and accessibility automation (axe / Lighthouse). 

## Recently Completed
- Configurable rolling window P/L goals (windowDays) added to Goal model & service.
- Accessible Tooltip component (keyboard + Escape dismiss) replacing native title attributes.
- Contrast tokens introduced: `--color-border-strong`, `--color-bg-muted`, `--color-bg-inset` (improves delineation & layered surfaces).
- Unified focus ring tokens (`--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-shadow`) + `.focus-ring` utility.
- Accessibility checklist & design system docs updated accordingly.

## Current Coverage Snapshot
| Area | Status | Notes |
|------|--------|-------|
| Auth & Users | COMPLETE | NextAuth integrated. |
| Trades & Tags CRUD | COMPLETE | Soft delete & restore logic established. |
| Instruments | COMPLETE | Archive path planned (spec scaffolded). |
| Analytics Core | COMPLETE | Metrics: PnL, win rate, expectancy, profit factor, drawdown, tag performance. |
| Goals | COMPLETE (v2) | Includes streak & rolling window variants. |
| Risk Engine | COMPLETE (v1) | Daily loss %, per-trade risk %, consecutive losses, breach logging w/ suppression. |
| Exports | PARTIAL | Trades CSV only; needs column selection & JSON. |
| Design System | PARTIAL → Stable Core | Dark theme solid; light theme contrast audit in progress. |
| Accessibility | STRONG BASE | Automation & form-summary pending. |
| Testing | GOOD BASELINE | Need added tests for rolling goals variants. |

## Accessibility Highlights
See `ACCESSIBILITY_CHECKLIST.md` (updated). Gaps: automated contrast verification, keyboard regression (Playwright) tests, form-level aggregated error summary.

## Performance Considerations
- Rolling windows reuse a cached Map keyed by windowDays during a single recalculation to avoid repeated filtering (prevents O(n * k) blowup).
- Future pre-aggregation (daily P/L table) deferred until dataset growth warrants.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Light theme contrast regressions | A11y non-compliance | Add jest-axe + contrast matrix doc. |
| Export scope creep | Delayed reporting milestone | Phase: (1) column selection, (2) JSON, (3) streaming CSV, (4) XLSX (optional). |
| Goal calc performance with many windows | Slower UI | Maintain cached trade slice + incremental recompute later. |
| Missing tests for windowDays edge cases | Undetected logic bugs | Add targeted test suite (1,7,30,90-day windows). |

## Next 5 Priority Actions
1. Add tests for `ROLLING_WINDOW_PNL` goal (edge & typical windows).
2. Implement column selection for trades CSV export (query param + dynamic header).
3. Add JSON export endpoint (reusing filter logic) preparing for XLSX/PDF.
4. Implement form-level error summary component (role="alert", anchor links to invalid fields).
5. Integrate axe (jest-axe) + minimal Lighthouse CI for contrast & landmark checks.

## Deferred / Backlog
- High-contrast theme toggle persistence.
- PDF dashboard snapshot.
- Offline capture (PWA) & pre-aggregated daily table.
- Observability instrumentation (Sentry / OTEL).

## Open Decisions
| Topic | Decision Needed | Notes |
|-------|-----------------|-------|
| Export row limit (5000) | Keep vs streaming | Keep for now; revisit after JSON endpoint. |
| Debounce interval (500ms) | Adjust with more data? | Monitor; consider adaptive mechanism later. |
| Additional risk rules | Add intraday drawdown? | Defer until user feedback. |

## Data Model Delta
- Goal: added optional `windowDays:Int?` for configurable rolling windows.

## Action Items
| # | Action | Target |
|---|--------|--------|
| 1 | Rolling window goal tests | Short-term |
| 2 | Export column selection | Short-term |
| 3 | JSON export endpoint | Near-term |
| 4 | Form error summary | Short-term |
| 5 | Accessibility automation | Short-term |

## Phase 1 Stabilization Plan (Initiated)
Objective: Reduce immediate friction (lint noise, missing hooks plugin, prisma generate prerequisite) without large refactors, enabling clearer diffs for subsequent typing & a11y automation.

Scope (Week 1):
- Add `pretest` hook to always run `prisma generate` (DONE).
- Add `eslint-plugin-react-hooks` and enforce hooks rules (DONE).
- Temporarily downgrade `@typescript-eslint/no-explicit-any` to warning (DONE) to surface real errors distinctly; will revert to error in Phase 2 after introducing shared DTO types.
- Introduce optional module stub for `playwright` to prevent type errors when feature flag disabled (DONE).
- Capture baseline count of remaining warnings (next lint run post-change) to track reduction KPI (target: -70% by end of Phase 2).

Upcoming Within Phase 1:
- Establish shared `types/api.ts` with ResponseEnvelope<T> and key entity DTOs (trades, goals) then migrate 2–3 high-traffic routes off `any` (partial reduction while warnings accept).
- Add minimal CI note: ensure lint runs but does not fail build on warnings (documentation update).

Exit Criteria:
- All structural ESLint errors (unused vars, missing rules) resolved.
- Playwright optional feature build passes type-check without dependency installed.
- Baseline warnings documented for Phase 2 reduction.

Baseline Metrics (captured after initial Phase 1 refactor):
- Lint: 0 errors, 186 warnings (@typescript-eslint/no-explicit-any predominant)
- Test suites: 31/31 passing (44 tests)
- Type-check: clean (playwright stub active)

Notes: One service signature (createInstrument) kept backward compatible while removing unused internal user filtering; future Phase 2 may introduce per-user scoping.

## Phase 1 Completion Summary
Additional refinements applied post-baseline:
- Standardized ResponseEnvelope + DTOs for goals, instruments, daily analytics, export jobs.
- Added DTOs: GoalDTO, InstrumentDTO, DailyPnlPayload, ExportJobDTO (+ detail variant).
- Reduced warning count from 186 -> 175 through structural typing of key routes (no new errors introduced).
- Ensured export queue endpoints produce structured typed responses (feature-flag respected).

Phase 1 Exit Status: MET (zero lint errors, uniform API envelope on high-traffic routes, tests green, baseline warnings recorded, optional playwright feature stubbed).

## Phase 2 Plan (Typing & A11y Automation Kickoff)
Objectives:
- Reduce @typescript-eslint/no-explicit-any warnings by ≥70% (175 -> ≤52).
- Re-enable no-explicit-any as 'error' after targeted refactors complete (late Phase 2).
- Introduce automated a11y regression checks (jest-axe for component snapshots + add minimal Lighthouse CI script placeholder).
- Strengthen auth / prisma middleware typings (remove `as any` casts in session user extraction & prisma middleware).
- Add README / Architecture note on API response contract.

Scope (Initial Sprint):
1. Introduce `SessionUser` type and helper to extract typed user (removes scattered `(session?.user as any)` casts).
2. Type `analytics-cache` store (replace `any` with discriminated union keyed by cache segment).
3. Refactor `trade-service` hotspots to eliminate transaction parameter `any` and compute PnL parameters generics.
4. Tighten `errors.ts` with a concrete `AppError` union and mapping helpers returning `ApiError`.
5. Add `axe` tests for: nav-bar, tooltip, dashboard page (smoke), forms (goal create) focusing on roles/aria/contrast tokens presence.

Stretch (if time permits):
- Add `ExportJob` persistence planning doc (DB table schema sketch) without implementation.
- Type export queue params and builder (replace Record<string, any> with per-type param schema).

Deferred to Phase 3:
- Turn on strict ESLint `no-explicit-any` error.
- Full PDF export stabilization.
- Streaming CSV + JSON/XLSX export formats.

KPI Tracking:
- Warning count snapshot at Phase 2 start: 175.
- Target mid-sprint: ≤110; end-sprint: ≤52.

---

---
Generated: 2025-08-31
