# Architecture Overview

This document supplements `docs/ROADMAP.md` with a stable technical map of the system.

## 1. Layered Architecture
```mermaid
graph TD;
  UI[UI / Pages / Components]\n--Zod DTO--> API[Route Handlers]\nAPI -- Service Calls --> SVC[Domain Services]\nSVC -- Prisma ORM --> DB[(Database)]\nSVC -- Analytics --> AN[Analytics Module]\nAPI -- Auth Session --> AUTH[NextAuth]
```

Alternative ASCII:
```
[ UI (RSC + Client Components) ]
          | (fetch / actions)
          v
[ API Route Handlers ] -- validate --> [ Zod Schemas ]
          | calls
          v
[ Domain Services ] -- queries --> [ Prisma Client ] -- SQL --> [ DB ]
          | uses                          ^
          +--> [ Analytics Pure Functions ]
          +--> [ Risk Engine (v1) ]
```

## 2. Responsibility Split
| Layer | Responsibilities | Anti-Responsibilities |
|-------|------------------|-----------------------|
| UI | Rendering, accessibility, light formatting | Business rules, DB access |
| API Handlers | AuthN/Z, validation, mapping HTTP <-> domain errors | Heavy business logic, direct SQL |
| Services | Orchestrate multi-entity operations, risk checks, transaction boundaries | Rendering, request parsing |
| Analytics | Pure, deterministic calculations | IO, logging side-effects |
| Persistence | Schema, migrations, indexes | Domain decisions |

## 3. Data Access Pattern
- All Prisma calls originate in service modules (future: `services/*.ts`).
- Avoid calling Prisma directly from components or route handlers except for trivial fetch prototypes.
- Transactions: use `prisma.$transaction` wrapper in service when multiple dependent writes.

## 4. Caching Strategy (Incremental)
| Tier | Use Case | Tool |
|------|----------|------|
| In-memory (process) | Recent analytics for current user (≤ 5 min) | Simple Map/LRU |
| Edge (future) | Public aggregated stats | Vercel Edge cache |
| DB materialization (future) | Daily P/L pre-aggregation | Scheduled job + table |

## 5. Concurrency & Consistency
- Optimistic concurrency (default). If we add fields likely to collide (e.g. editing notes concurrently), consider a `updatedAt` comparison guard.
- For high-frequency logging use-case (not expected early), we can introduce a write queue or batch insert.

## 6. Background Jobs
| Job | Trigger | Purpose |
|-----|--------|---------|
| Equity Rebuild (global) | Cron (nightly) via `POST /api/cron/equity-rebuild` | Pre-compute daily equity/PnL for all users |
| Equity Rebuild (per-user) | On-demand via `POST /api/cron/equity-rebuild-user` | Targeted recompute for a user/date window |
| Export Perf Prune | Cron (hourly/daily) via `POST /api/cron/export-perf-prune` | Trim export performance samples table |
| Backup Verify | Cron (weekly) via `GET /api/cron/backup-verify` | Sanity-check entity counts and sample data |
| PDF Report Generation | User request (async) | Offload heavy PDF build |

Queue options (scaling): external worker or managed queue (e.g., Redis/BullMQ) if throughput grows; current implementation runs in-process with persistence.

## 7. Observability Plan
| Instrumentation | Tool | Notes |
|-----------------|------|------|
| Error Tracking | Sentry | DSN via env |
| Metrics (latency) | OpenTelemetry exporter -> vendor | Minimal spans around service boundaries |
| Structured Logs | pino | JSON for shipping; include `reqId` for request correlation (echoed as `x-request-id` header) |

## 8. Security Model
| Concern | Approach |
|---------|---------|
| AuthN | NextAuth session cookies (httpOnly, secure prod) |
| AuthZ | User resource ownership checks (userId match) |
| Input Validation | Zod schemas – reject unknown keys |
| Rate Limiting | Middleware (Redis token bucket) (planned) |
| Secrets | `.env` only, never committed |

## 9. Frontend Composition
| Component Type | Examples | Notes |
|---------------|----------|------|
| Layout | `app/layout.tsx` | Global providers, nav |
| Page (RSC) | `/app/(dashboard)/page.tsx` | Fetch server data |
| Client Interactive | Trade form, filters | Use `use client` directive |
| Utility | Chart wrappers, tag badge | Reusable & accessible |

## 10. Extensibility Points
| Point | Mechanism |
|-------|-----------|
| Metrics | Add function to analytics registry (future) |
| Risk Rules | Strategy list executed per trade action |
| Exporters | Interface (CSV, PDF, JSON) |
| Feature Flags | Simple table read or environment gating |

## 11. Deployment Pipelines
1. PR opened -> GitHub Action: install, lint, type-check, test, build.
2. Preview deploy (Vercel). Manual QA.
3. Merge -> Production build.
4. Post-deploy smoke test script (ping `/` and perform lightweight DB query).

## 12. Operational Runbooks (Early Draft)
| Scenario | Action |
|----------|--------|
| Failed Migration | Roll back deployment, inspect migration SQL, fix & re-run `prisma migrate deploy` |
| High Error Rate | Check recent deployment, feature flags, revert if needed |
| Slow Queries | Inspect Prisma logs + create missing index |

## 13. Future Considerations
- Multi-region read replicas if latency becomes an issue.
- Event sourcing variant if auditing becomes compliance requirement.
- Broker API ingestion adapter (scheduled import) for automation.

### Appendix A: Goal Recalculation Caching
Current implementation debounces recalculation (500ms) and constructs a cached Map of rolling window sums keyed by windowDays to avoid repeated filtering when multiple rolling goals are present in the same pass. Future: daily aggregate table for O(1) window queries.

### Appendix B: FX Service (Raw SQL Exception)
While services generally access the DB through Prisma, the FX rate lookup/write path intentionally uses raw SQL to avoid initializing the Prisma query engine during unit tests and to reduce file-lock friction on Windows.
- Source: `lib/services/fx-service.ts`
- Strategy: DB-first lookup with in-memory cache; previous business-day fallback (up to 5 days); fetch via Frankfurter (ECB EOD) and upsert.
- Rollout: gated by `ENABLE_FX_CONVERSION` and backed by an admin/shared-secret cron endpoint for backfills.

### Appendix C: Exports Queue Instrumentation & Correlation
Persistent export jobs capture performance samples in a lightweight table (created best-effort via raw SQL) and correlate logs end-to-end using `requestId`.
- Endpoints: `/api/exports/jobs`, `/api/exports/jobs/:id`, `/api/exports/jobs/:id/download`, `/api/exports/jobs/perf`.
- Memory guard: streaming CSV path uses an async generator and a soft memory limit; terminal classification prevents wasteful retries.

_Last updated: 2025-09-07 (cron endpoints concretized; request correlation note)_
