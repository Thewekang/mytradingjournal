# Execution Plan (Phase 3) – Sep 2 2025

## Scope Definition of "Complete Workable App"
See status report for checklist. This file tracks live progress against the prioritized sequence.

## Work Streams
- DS/A11y
- Exports & Reporting
- Observability
- Performance & Aggregation
- Analytics & Goals
- Offline / PWA
- Internationalization
- Prop Firm Support (Milestone 10)

## Sprint Sequencing (High Level)
1. Foundations Hardening (contrast + logging + streaming CSV)
2. Performance (pre-aggregation + validator + new metrics)
3. Advanced Goals (composite, per-instrument)
4. Offline + Export Enhancements (chart image, PDF stabilize)
5. i18n + QA Automation (Lighthouse, Playwright)

## Active Items (Week of Sep 2)
| ID | Item | Stream | Owner | Status | Notes |
|----|------|--------|-------|--------|-------|
| EX-1 | Column selection UI | Exports | dev | DONE | Ships `selectedColumns` param. |
| EX-2 | Token expiry & one-time use | Exports | dev | DONE | Expiry default 10m; mark consumed. |
| EX-3 | Streaming CSV threshold constant | Exports | dev | TODO | Introduce env or constant (e.g. 10_000). |
| OBS-1 | Request ID propagation | Observability | dev | PARTIAL | Middleware sets header; surface in more logs. |
| OBS-2 | Worker log context | Observability | dev | TODO | Add reqId surrogate (jobId). |
| PERF-1 | DailyEquity schema draft | Performance | dev | TODO | Add migration & model. |
| ANA-1 | Avg hold time metric | Analytics | dev | TODO | Compute from closed trades. |
| ANA-2 | Daily variance metric | Analytics | dev | TODO | Variance of daily P/L. |
| DS-1 | Light theme contrast finalization | DS/A11y | dev | IN PROGRESS | Adjust hover/disabled states. |
| PROP-1 | Prop evaluation data model design | Prop | dev | DONE | See PROP_FIRM_SUPPORT.md (draft). |
| PROP-2 | Prop evaluation schema & migration | Prop | dev | TODO | Add PropEvaluation table. |
| PROP-3 | Progress & alert service | Prop | dev | TODO | Integrate with risk banner. |

## Micro Backlog (Ready)
| ID | Title | Type | Estimate | Blockers |
|----|-------|------|----------|----------|
| EX-4 | Async generator streaming impl | feature | M | EX-3 |
| OBS-3 | Sentry integration | infra | S | None |
| PERF-2 | Pre-aggregation validator script | feature | S | PERF-1 |
| GOAL-1 | Composite goal schema | schema | M | None |
| GOAL-2 | Per-instrument goal evaluation | feature | M | GOAL-1 |
| OFF-1 | PWA manifest + SW scaffold | feature | S | None |
| OFF-2 | Offline trade draft queue | feature | M | OFF-1 |
| I18N-1 | Locale scaffold | infra | S | None |
| QA-1 | Lighthouse CI config | infra | S | DS-1 |
| QA-2 | Playwright keyboard smoke | test | M | QA-1 |
| PROP-4 | Prop evaluation progress API | feature | M | PROP-2 |
| PROP-5 | Prop evaluation alerts integration | feature | M | PROP-3 |
| PROP-6 | Prop evaluation export (CSV/JSON) | feature | S | PROP-4 |

## Decision Log (Incremental)
| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-09-02 | Streaming threshold to start at 10,000 rows | Balance memory & complexity; revisit with perf data. |
| 2025-09-02 | Token expiry default 10 minutes | Minimizes exposure while avoiding user friction. |

## Metrics to Track
- Export success rate (completed / total)
- Streaming activation rate (jobs > threshold)
- Pre-aggregation latency improvement (baseline vs after adoption)
- A11y score (Lighthouse) trend
- Error rate (Sentry issues / day)

## Next Update
Daily during active implementation; promote DONE items and add new tasks as they are accepted.
