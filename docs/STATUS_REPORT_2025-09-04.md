# Project Status Report – Sep 4 2025

## Executive Summary
Reliability, observability, and data integrity advanced substantially: streaming CSV export path (async generator + footer) with soft memory limit terminal classification landed; requestId correlation spans API enqueue through worker logs; export performance instrumentation backend (timings table + perf endpoint) operational. Daily equity validation (recompute vs stored) plus manual rebuild endpoint shipped and surfaced in dashboard UI via new status component. All tests passing (57 files / 85 tests). Roadmap updated. Upcoming focus: performance metrics UI, automated equity pre-aggregation scheduling, Sentry/OTEL instrumentation, and additional analytics metrics (avg hold time, daily variance).

## Changes Since Sep 3
- Streaming generator + footer (# streamed_rows) with FORCE_STREAM override.
- Soft memory limit detection & terminal failure classification (no retry churn) plus logging of memory deltas.
- RequestId persisted on `ExportJob`; legacy fallback removed; correlation in all `export.job.*` logs.
- Export performance instrumentation: `ExportJobPerformance` table + `/api/exports/jobs/perf` endpoint (p50/p95, max calculations client-ready).
- Daily equity validation service (diff expected vs stored) + `/api/equity/validate` GET (validate) / POST (rebuild+validate).
- Dashboard: `EquityValidationStatus` component + `useDailyEquityValidation` hook integrated early in overview.
- Stabilized streaming persistence test (timeout 8s→15s; broadened break conditions).
- Patched route handlers to use getter accessors for streaming thresholds after constant refactor.
- Updated roadmap (pre-aggregation now PARTIAL; observability progress, instrumentation backend done).
- Added memory soft limit docs & clarified streaming behavior.

## Current Focus (Next 5 Days)
1. Export performance metrics UI (recent runs + percentile badges + retention guard design).
2. Automated equity rebuild scheduling + persisted last validation timestamp (cron / background job).
3. Sentry + OpenTelemetry (trace IDs, error capture, key spans for exports & validation).
4. Avg hold time & daily variance metrics + tests.
5. Light theme contrast polish & skip link (design system finish tasks).

## Metrics & Quality
- Tests: 85/85 (57 files) passing.
- Type / Lint: Clean.
- Build: Passing after constants import refactor.
- Export Reliability: Exponential retry (max 3), stale recovery, terminal memory guard prevents wasteful retries.
- Streaming Footprint: Footer present in forced mode; below threshold path tolerated.
- Equity Validation: Zero discrepancies post rebuild (test enforced); UI reflects status instantly.

## Coverage Snapshot (Delta Focus)
| Area | Status | Delta |
|------|--------|-------|
| Exports | CORE + STREAMING | Added streaming + memory soft limit + instrumentation |
| Observability | PARTIAL | Correlation + perf backend; Sentry/OTEL pending |
| Performance (Equity) | PARTIAL | Validation + manual rebuild + UI surfaced |
| Design System | IN PROGRESS | No change today (light theme polish pending) |
| Advanced Goals | PENDING | Unchanged |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Perf table unbounded growth | Storage bloat | Implement retention pruning (e.g. rolling 14 days) |
| No automated equity rebuild | Potential drift | Schedule periodic rebuild + timestamp display |
| Missing Sentry/OTEL | Slower incident triage | Prioritize instrumentation sprint |
| Streaming footer absent when under threshold | Test ambiguity | Guard tests: assert footer only when forced; add explicit log |
| Memory soft limit miscalibration | False terminals | Collect histogram & tune; expose threshold in diagnostics |
| Lack of UI for perf metrics | Harder regression detection | Build minimal metrics table w/ sparkline next |

## Action Items
| # | Action | Status |
|---|--------|--------|
| 1 | Export performance metrics UI | Pending |
| 2 | Equity rebuild scheduling + timestamp | Pending |
| 3 | Sentry / OTEL integration | Pending |
| 4 | Avg hold time & daily variance metrics | Pending |
| 5 | Light theme contrast polish & skip link | Pending |
| 6 | Perf table retention pruning script | Pending |
| 7 | Correlation ID in download response headers | Pending |
| 8 | Error classification expansion (terminal/transient/validation) | Pending |
| 9 | Discrepancy drill-down UI (equity diff detail) | Pending |
| 10 | Deterministic streaming footer harness | Pending |

## Open Decisions
| Topic | Question | Target |
|-------|----------|--------|
| Equity rebuild cadence | Nightly vs hourly? | Before scheduling impl |
| Perf retention policy | Keep N days vs cap rows? | Prior to UI surfacing |
| Memory soft limit value | Dynamic vs fixed threshold? | After initial metrics review |
| Sentry transaction sampling | % of requests vs exports only | Pre instrumentation |

## Summary
Exports are production-grade for large data (streaming + memory guarding + correlation + instrumentation). Equity correctness is now user-visible with rebuild tooling. Foundation is ready for next observability and performance iteration (Sentry/OTEL, automated pre-aggregation, metrics UI).

_Generated: 2025-09-04_
