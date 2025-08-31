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

## 6. Background Jobs (Planned)
| Job | Trigger | Purpose |
|-----|--------|---------|
| Daily Metrics Rebuild | Cron (UTC 00:05) | Pre-compute daily P/L & drawdown | 
| PDF Report Generation | User request (async) | Offload heavy PDF build |
| Data Retention Cleanup | Weekly | Archive soft-deleted trades |

Queue options (future): lightweight (in-memory + fallback) or external (Upstash Redis / Cloud task queue).

## 7. Observability Plan
| Instrumentation | Tool | Notes |
|-----------------|------|------|
| Error Tracking | Sentry | DSN via env |
| Metrics (latency) | OpenTelemetry exporter -> vendor | Minimal spans around service boundaries |
| Structured Logs | pino | JSON for shipping |

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

_Last updated: 2025-08-31 (risk engine v1 + rolling goals)_
