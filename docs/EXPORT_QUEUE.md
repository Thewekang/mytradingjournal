# Export Queue

Feature flags:
 - `ENABLE_EXPORT_QUEUE=1` (turns on export subsystem)
 - `ENABLE_PERSIST_EXPORT=1` (enables persistent DB-backed worker instead of in-memory)

## Goals
- Offload potentially heavy export generation from interactive requests.
- Provide job status polling + eventual download link.
- Establish interface for future background worker (e.g. separate process / queue system).

## Current Capabilities
- Two modes:
  - In-memory (non-durable) for local/dev.
  - Persistent (Prisma `ExportJob` table) with retry/backoff & metrics (recommended).
- Job types: `trades`, `goals`, `dailyPnl`, `tagPerformance`.
- Formats: `csv`, `json`, `xlsx`.
- Filtering (trades): `dateFrom`, `dateTo`, `tagIds`, `instrumentId`, `status`, `direction`, `limit`.
- Retry / backoff: exponential (500ms * 2^attempt) capped at 30s, max 3 attempts.
- Security: signed HMAC download token (enforced when `NODE_ENV !== 'test'`).
- Rate limiting: max 5 active (queued + running) jobs per user (persistent mode).
- Metrics (health endpoint): queued, processed, failed, retried, running, avgDurationMs.
- UI: `/exports` page to create jobs, apply filters (trades), monitor status, download.
- Auto-prune (in-memory): completed jobs removed after 15 minutes.
- Token expiry (default 10 minutes) & one-time consumption (subsequent downloads require new job)

## Roadmap Enhancements
- Column selection UI + param for fine-grained trade exports (builder already supports underlying mapping).
- Streaming CSV fallback for very large datasets (> threshold) to reduce memory footprint.
- Token expiry (timestamp-signed) & optional one-time download invalidation.
- Notification hook (webhook / websocket) on completion.
- Progress reporting (rows processed / total) for streaming jobs.
- Dedicated worker process or external queue (BullMQ / cloud tasks) for isolation.
- Object storage for large payloads (store reference instead of base64 in DB).
- i18n-aware formatting (numbers/dates) for localized exports.
- Column selection for trade exports (subset of default headers)

## Architecture Notes
- Shared builder (`lib/export/builders.ts`) produces a normalized table (headers + row objects) then serializes to chosen format.
- In-memory mode uses simple FIFO array; persistent mode polls DB (`status='queued'` + optional `nextAttemptAt`) every 200ms.
- Retry logic: on failure increments `attemptCount`, schedules `nextAttemptAt`; final failure sets `status='failed'` with error.
- Binary (XLSX) handled via Buffer -> base64 for transport; future large file strategy may stream to object storage.
- Download token: `hex(hmac_sha256(secret, jobId)).slice(0,32)` passed as `?token=`; validated in download route.
- Health endpoint (`/api/health`) consumes metrics for observability dashboards.

## Limitations
- Large dataset streaming path not yet implemented (all payloads buffered then base64 encoded).
- No column selection parameter exposed (pending UI/API addition).
- Download tokens currently non-expiring (rely on auth + random IDs).
- No notification push (polling only).
- Retry does not classify error types (all failures retried until max attempts).

## Example Workflow (Persistent Mode)
1. Client POST `/api/exports/jobs` with `{ type: 'trades', format:'xlsx', params:{ dateFrom:'2025-08-01', dateTo:'2025-08-31', tagIds:['abc','def'] } }`.
2. API creates `ExportJob` (status `queued`).
3. Worker loop finds job, sets `running`, builds export, marks `completed` (or schedules retry on error).
4. Client polls list/detail every 2s (or uses future push channel).
5. Once `completed`, client uses provided `downloadToken` to GET download route.
6. Health endpoint reflects updated processed/failed/retried counts.

## Testing
- Vitest suites cover: persistence lifecycle, multi-format outputs, download token presence, rate limiting.
- In test environment token check is bypassed (set via code) to simplify assertions.
