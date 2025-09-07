# Export Queue

Feature flags:
 - `ENABLE_EXPORTS=1` (turns on persistent export subsystem)

## Goals
- Offload potentially heavy export generation from interactive requests.
- Provide job status polling + eventual download link.
- Establish interface for future background worker (e.g. separate process / queue system).

## Current Capabilities
| Area | Capability |
|------|------------|
| Persistence | Prisma `ExportJob` table with retry/backoff & lightweight performance instrumentation table (`ExportJobPerformance`) created on demand (raw SQL) |
| Job Types | `trades`, `goals`, `dailyPnl`, `tagPerformance`, `propEvaluation` |
| Formats | `csv`, `json`, `xlsx` |
| Filtering (trades) | `dateFrom`, `dateTo`, `tagIds`, `instrumentId`, `status`, `direction`, `limit`, `selectedColumns[]` (subset columns) |
| Retry / Backoff | Exponential (500ms * 2^attempt) capped at 30s, max 3 attempts (terminal classification for memory soft limit errors) |
| Error Classification | "Export memory soft limit exceeded" is treated as terminal (no retries) to surface misconfiguration quickly |
| Correlation | Optional `requestId` captured from originating request and stored on job → echoed in structured logs (`export.job.*`) |
| Security | Signed HMAC download token (enforced when `NODE_ENV !== 'test'`) with expiry + one‑time consumption |
| Rate Limiting | Max 5 active (queued + running) jobs per user |
| Metrics (health) | queued, processed, failed, retried, running, avgDurationMs (in‑memory) |
| Performance Endpoint | `/api/exports/jobs/perf` returns recent `ExportJobPerformance` rows (best‑effort; empty if table creation failed) |
| Streaming CSV | Async generator path when row count > threshold or `FORCE_STREAM_EXPORT=1`; appends footer line `# streamed_rows=<n>` |
| Memory Soft Limit | Configurable soft cap (MB) for accumulated streamed bytes; exceed → immediate fail with explanatory error |
| UI | `/exports` page: create jobs, filter trades, monitor status, download tokens |
| Token Refresh | `POST /api/exports/jobs/:id/token` regenerates token & extends expiry for completed jobs |
| Prop Evaluation Export | `propEvaluation` summarizes active evaluation progress (phase, status, profitTarget, cumulativeProfit, progressPct, remaining limits, alerts) |

## Roadmap Enhancements
- Push notifications (websocket / webhook) on completion (reduces polling).
- Progress streaming (rows processed / total) mid-job for very large exports.
- Dedicated isolated worker process (or external queue e.g. BullMQ) for horizontal scaling & memory isolation.
- Object storage for very large payloads (store reference, not base64) with lazy download.
- i18n-aware number/date formatting.
- Advanced column aliasing / reordering & presets.
- Multi-user bulk export (admin) batching.
- Structured histogram metrics (chunk size & duration percentiles already logged → surface in UI).
- Hard memory kill-switch + alerting (current soft limit is fail-fast without alert).

## Architecture Notes
- Shared builder (`lib/export/builders.ts`) normalizes rows (headers + object array) then serializes per format.
- Streaming CSV path returns an async generator; worker accumulates chunks in-memory (to base64) while tracking per‑chunk timing & size percentiles (P50/P95/max) → logged on completion.
- Soft memory guard: accumulated streamed bytes compared against `EXPORT_MEMORY_SOFT_LIMIT_MB`; crossing the limit throws a terminal error (no retries) and flags job `failed` with an explanatory message.
- Worker polling loop (200ms) also recovers stale `running` jobs older than 15s by re‑queuing (prevents test flakiness after crashes).
- Retry logic: non‑terminal errors increment `attemptCount` and schedule `nextAttemptAt` using exponential backoff; terminal classification currently only the memory soft limit condition.
- Performance rows persisted best‑effort to ad‑hoc `ExportJobPerformance` table (raw SQL `CREATE TABLE IF NOT EXISTS`). Missing table never blocks exports.
- Structured logs (`export.job.enqueued|started|completed|failed`) include `requestId` (if provided) for end‑to‑end correlation.
- Download token: `hex(hmac_sha256(secret, jobId + '|' + expiryMs|"none")).slice(0,32)` passed as `?token=`; validated server‑side + one-time consumption (except in tests).
- Health metrics kept in-process only; performance endpoint gives richer recent job stats.

## Limitations
- Still buffers entire streamed CSV before persistence (streaming is chunked for construction but final DB payload stored whole; object storage would remove this constraint).
- No push notifications yet (polling only).
- Only one terminal error classification (memory soft limit); others may benefit from classification (e.g. validation vs transient network).
- Performance table retention pruning is naive (periodic best‑effort prune; no TTL config exposed).
- Base64 storage inflates binary size (~33% overhead) until object storage is adopted.

## Example Workflow (Persistent Mode)
1. Client POST `/api/exports/jobs` with `{ type: 'trades', format:'xlsx', params:{ dateFrom:'2025-08-01', dateTo:'2025-08-31', tagIds:['abc','def'] } }`.
2. API creates `ExportJob` (status `queued`).
3. Worker loop finds job, sets `running`, builds export, marks `completed` (or schedules retry on error).
4. Client polls list/detail every 2s (or uses future push channel).
5. Once `completed`, client uses provided `downloadToken` to GET download route.
6. If token expired (410) client may call `POST /api/exports/jobs/:id/token` to refresh and retry download.
7. Performance endpoint `/api/exports/jobs/perf` can be queried to display recent latency / size stats.
8. Structured logs allow correlating the job to upstream request via `requestId` (if present).

## Testing
- Vitest suites cover: persistence lifecycle, streaming path (footer + fail‑fast on soft limit), multi-format outputs, download token logic, requestId propagation (enqueue + list/filter), rate limiting, performance endpoint, retry/backoff behavior.
- In test environment: download token validation bypassed, environment setters used to force streaming & simulate low memory limit.
- Memory soft limit test sets an extremely small MB value to trigger terminal failure deterministically.
- Prop evaluation export: seeds an ACTIVE evaluation via service helper and validates JSON output end-to-end through the persistent queue.
