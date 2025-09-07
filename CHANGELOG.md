# Changelog

All notable user-facing changes to this project will be documented here.

## [Unreleased]
- (add new entries above this line)

## [2025-09-07] 0.3.0 — Milestone 10 Complete, Equity Pre‑Aggregation Scheduling, a11y Stability

### Added
- Nightly schedule for Daily Equity pre‑aggregation with local cron trigger; surfaced validation status in the dashboard.
- Batched upsert optimization for Daily Equity rebuilds to reduce query round‑trips and improve performance.
- Lightweight performance table and endpoint to inspect export processing timings.

### Changed
- Roadmap and status docs aligned: Milestone 10 marked COMPLETE; all items under “4a. Near‑Term Next Steps” and “4. Upcoming” reconciled and marked DONE where applicable.
- package.json version bumped to 0.3.0.

### Fixed
- Stabilized Risk Breach Banner a11y test flakiness by guarding client fetch effects and refining test stubs/axe filtering.

### Notes
- No API contract changes in this release; builds and type checks pass across the updated docs and version bump.

## [2025-09-06] PDF Report Page, FX Conversion (flagged), Export Streaming & Equity Validation

### Added
- Dashboard print report page (`/reports/dashboard?print=1`) wired with real data & filters; PDF export endpoint (`/api/dashboard/export/pdf`) forwards query params.
- FX conversion service (raw SQL) with ECB/Frankfurter daily rates, in-memory cache, and previous-business-day fallback; cron endpoint `/api/cron/fx-backfill` (guarded by shared secret or admin session).
- Export streaming path (async generator) with soft memory limit terminal classification and footer `# streamed_rows=<n>` when forced.
- Export performance endpoint `/api/exports/jobs/perf` and lightweight performance table (best-effort create).
- Daily equity validation endpoint (`GET /api/equity/validate`) and rebuild (`POST /api/equity/validate`); dashboard status component surfaces validation results.

### Changed
- Roadmap updated to mark Milestone 7 (Settings & Personalization) COMPLETE; advanced goals moved to follow-ups.
- Architecture doc appended with FX raw SQL exception & exports instrumentation notes.

### Notes
- Feature flags: `ENABLE_PDF_EXPORT`, `ENABLE_EXPORTS`, `ENABLE_FX_CONVERSION`.
- Windows dev: prefer CI/WSL for DB-backed tests; unit tests may stub Prisma with `FOCUS_TEST=1`.

## [2025-09-03] Export Subsystem Flag Consolidation & In-Memory Queue Removal

### Changed
- Replaced dual feature flags `ENABLE_EXPORT_QUEUE` and `ENABLE_PERSIST_EXPORT` with a single unified `ENABLE_EXPORTS` flag controlling the entire async export subsystem (job creation, worker, metrics, download token enforcement).

### Removed
- Deleted legacy in-memory export queue implementation (`lib/export/queue.ts`). The persistent DB-backed queue (Prisma `ExportJob` table) is now the only supported path.
- Eliminated all code paths, tests, and docs referencing the deprecated in-memory mode.

### Added
- Explicit migration note (this entry) to aid environment & CI updates.

### Migration Guide
1. Environment:
   - Remove any occurrences of `ENABLE_EXPORT_QUEUE` and `ENABLE_PERSIST_EXPORT` from local `.env` files, deployment configs, and CI workflow files.
   - Add `ENABLE_EXPORTS=1` wherever exports should be enabled. If omitted or set to anything other than `1`, the export endpoints and worker will be disabled.
2. CI / Infrastructure:
   - Update workflow environment variable definitions (e.g. GitHub Actions `env:` blocks) to use `ENABLE_EXPORTS` only.
3. Code (if you had custom extensions):
   - Delete any imports of `lib/export/queue`. The file no longer exists; use the service layer in `lib/services/export-job-service.ts` if you were programmatically enqueueing jobs.
4. Tests:
   - Replace any test setup that set old flags with `process.env.ENABLE_EXPORTS = '1'`.
5. Observability:
   - Health endpoint metrics now report only the persistent queue figures. No action needed unless you scraped previous mode labels.

### Verification Steps
- After updating env vars run: `npm run build` then `npm test -- --testPathPattern=export-` to confirm export-related suites pass.
- Call `/api/health` and confirm `exports` metrics object appears (when `ENABLE_EXPORTS=1`).

### Rationale
Consolidating the flags reduces configuration complexity and prevents partial enablement states that previously caused confusion (e.g. worker disabled while endpoints accepted jobs). Removing the unused in-memory queue shrinks maintenance surface area and clarifies the single supported architecture.

---
Older history prior to this file's introduction is captured in commit messages and status reports under `docs/`.
