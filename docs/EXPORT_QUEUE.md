# Export Queue (Experimental)

Feature flag: `ENABLE_EXPORT_QUEUE=1`

## Goals
- Offload potentially heavy export generation from interactive requests.
- Provide job status polling + eventual download link.
- Establish interface for future background worker (e.g. separate process / queue system).

## Current Scope (MVP)
- In-memory queue (non-durable) with FIFO and 1-worker concurrency.
- Supported job types: `trades`, `goals`, `dailyPnl`, `tagPerformance` (CSV only for now).
- Routes:
  - `POST /api/exports/jobs` create job `{ type, format (csv) }` -> 202 + job meta.
  - `GET /api/exports/jobs` list recent jobs (current user, max 100).
  - `GET /api/exports/jobs/:id` job detail.
  - `GET /api/exports/jobs/:id/download` download when status=completed.
- Jobs auto-pruned 15 minutes after completion.

## Roadmap Enhancements
- Persist jobs (Prisma model) for durability & auditing.
- Support JSON / XLSX outputs (refactor to reuse existing export logic functions).
- Parameter validation & column selection per job.
- Notification hook (email/websocket) on completion.
- Progress metrics (rows processed, bytes written) for streaming tasks.
- Multi-tenant throttling / per-user rate limiting.
- Shift worker to dedicated queue (BullMQ / cloud task runner) if scaling required.

## Architecture Notes
`lib/export/queue.ts` maintains an in-memory Map + array queue. Processing is synchronous per job (placeholder payload generation). For real exports, factor shared data fetch + serialization utilities and stream to a temp file, then base64 or provide direct file serving.

## Limitations
- Non-persistent: restart loses queued/completed jobs.
- Security: relies on NextAuth session, no additional scoping yet beyond user id check.
- Memory: payloads stored in RAM; large exports should stream to object storage.
