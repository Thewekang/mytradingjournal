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

---
Generated: 2025-08-31
