# Prop Firm Support Specification — Aligned Sep 7 2025

## Objective
Enable traders in prop firm evaluations or funded accounts to configure firm-specific rules and receive real-time analytics, alerts, and progress tracking to pass evaluations and preserve funded status.

Current status (v0.3.0):
- Implemented Prisma model (`PropEvaluation`) with CRUD and active evaluation selection.
- APIs live: create, get active, rollover, and progress snapshot.
- Risk banner surfaces prop alerts; dashboard card shows progress.
- Export bundle type `propEvaluation` supported via persistent export queue (CSV/JSON/XLSX).
- Follow-ups (trailing formula specifics, intraday daily loss semantics, multi-account) tracked in `docs/ISSUES.md`.

## Core Concepts
- Evaluation Phase: Distinct period with target & limits (Phase 1, Phase 2, Funded, Reset).
- Rule Set: Parameter collection defining constraints & success criteria.
- Breach Levels: WARN (approaching), BLOCK (exceeded), INFO (progress milestones).
- Projection Metrics: Estimated days to target, allowable average daily loss remaining.

## Data Model (Implemented)
`prisma/schema.prisma` excerpt:
```
model PropEvaluation {
  id                 String   @id @default(cuid())
  user               User     @relation(fields: [userId], references: [id])
  userId             String
  firmName           String
  phase              String   @default("PHASE1") // PHASE1 | PHASE2 | FUNDED | RESET
  accountSize        Float
  profitTarget       Float
  maxDailyLoss       Float
  maxOverallLoss     Float
  // Maximum allowed single-trade risk as a percent of account size (e.g., 1.0 = 1%)
  maxSingleTradeRisk Float?
  trailing           Boolean  @default(false)
  minTradingDays     Int      @default(0)
  consistencyBand    Float?   @default(0.4)
  startDate          DateTime
  endDate            DateTime?
  status             String   @default("ACTIVE") // ACTIVE | PASSED | FAILED | ARCHIVED
  cumulativeProfit   Float    @default(0)
  peakEquity         Float    @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  @@index([userId, status])
}
```
Notes:
- Daily normalization table is not required; existing daily analytics feed progress and drawdown metrics.

## Derived Metrics
- Remaining Target = profitTarget - cumulativeProfit
- Max Allowable Loss Today = maxDailyLoss - currentDayLoss
- Overall Drawdown = startingEquity + cumulativeProfit - peakEquity
- Remaining Risk Budget = maxOverallLoss - realizedDrawdown
- Consistency Ratio (largest winning day / total profit)
- Projected Days to Target = Remaining Target / max(1, avgDailyProfit)

## Alert Conditions
| Code | Condition | Level |
|------|-----------|-------|
| PF_NEAR_DAILY_LOSS | currentDayLoss >= 0.8 * maxDailyLoss | WARN |
| PF_DAILY_LOSS | currentDayLoss > maxDailyLoss | BLOCK |
| PF_NEAR_OVERALL_LOSS | realizedDrawdown >= 0.8 * maxOverallLoss | WARN |
| PF_OVERALL_LOSS | realizedDrawdown > maxOverallLoss | BLOCK |
| PF_CONSISTENCY_RISK | largestDayProfit > consistencyBand * totalProfit | WARN |
| PF_TARGET_REACHED | cumulativeProfit >= profitTarget | INFO |
| PF_MIN_DAYS_PENDING | daysTraded < minTradingDays (when target met) | INFO |

## APIs
- POST `/api/prop/evaluations` — create evaluation
- GET `/api/prop/evaluations/active` — fetch current active evaluation
- POST `/api/prop/evaluations/rollover` — move to next phase or reset per rules
- GET `/api/prop/evaluation/progress` — computed metrics & alerts for active evaluation

## Service Logic Outline
1. On trade close: update evaluation aggregates (cumulative profit, peak equity, daily buckets).
2. Recompute alerts (risk engine extension) and push to existing breach banner with new category.
3. If target reached & minTradingDays satisfied → mark PASSED; else show pending-days message.
4. If breach (daily/overall) → mark FAILED (configurable: immediate vs soft fail with review).

## UI Surfaces
- Dashboard widget: Evaluation progress, remaining daily loss budget, days traded vs minimum.
- Detailed evaluation view (incremental): daily results, breach history, projections.
- Risk banner integration: surfaces highest severity prop alert.

## Exports
- Persistent export type `propEvaluation` (CSV/JSON/XLSX) including rule set, progress snapshot, alerts.
- See `docs/EXPORT_QUEUE.md` for queue architecture and performance endpoint.

## Integration with Existing Systems
- Reuses risk breach banner and logging with a `PROP` category tag.
- Leverages existing analytics endpoints and daily aggregation to feed metrics.
- No dedicated feature flag required at this time; shipped by default with Milestone 10.

## Backfill / Migration Strategy
- Schema includes `PropEvaluation`; existing migrations apply via `prisma migrate deploy`.
- Optional onboarding flow can initialize the first evaluation for opted-in users.
- Historical start dates trigger recompute from `startDate` using existing analytics.

## Open Questions (tracked)
- Trailing drawdown exact formula — see ISSUES I-5.
- Handling intraday vs EOD daily loss triggers — see ISSUES I-6.
- Multi-account support (concurrent evaluations) — see ISSUES I-7.
- Consistency rules & projection tuning — see ISSUES I-8.
- PDF summary export — see ISSUES I-9.

## Follow-ups (Post‑M10)
- Consistency rules refinements and projection metrics (I-8)
- Evaluation rollover polish and archive UI (I-7)
- Trailing drawdown advanced logic (I-5)
- PDF summary export (I-9)

## Testing Plan (implemented)
- Unit: Metric computations (edge cases covered).
- Integration: Trade close updates evaluation; alerts emitted; rollover covered.
- API: CRUD, active fetch, progress; guarded routes.
- Export: Evaluation JSON/CSV/XLSX via persistent queue.

## Non-Goals
- Real-time streaming PnL from broker.
- Automated firm API integration.

---
Spec aligned with current implementation. Follow-ups tracked in `docs/ISSUES.md`.
