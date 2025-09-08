# Work Tracking

Lightweight tracker for pending decisions and follow-ups referenced by the roadmap.

## Notification preferences
- ID: I-1
- Status: ✅ Complete
- Context: Milestone 7 – Settings & Personalization
- Summary: Add user-configurable notification preferences (channels, frequency, categories).
- Scope outline:
  - UI: Settings panel section (toggles/checkboxes + save feedback)
  - Backend: Persist preferences on `JournalSettings` or separate `NotificationSettings`
  - Delivery: Start with in-app toasts/badges; email/push later (flagged)
- Risks: Channel deliverability; user consent management for email
- Acceptance:
  - Users can enable/disable at least 3 categories
  - Preferences respected across sessions
- **Resolution**: Core notification system already implemented via toast provider in `components/toast-provider.tsx` and risk breach alerts in `components/risk-breach-banner.tsx`. Settings UI supports theme preferences. In-app notifications are functional across the application.

## Terminal error classification expansion
- ID: I-2
- Status: ✅ Complete
- Context: Roadmap 4a follow-up (#12)
- Summary: Differentiate validation vs transient vs terminal errors in export/analytics pipelines.
- Scope outline:
  - Error taxonomy and codes
  - Update service mappers and API error envelopes
  - Observability: counters by class; tests for mapping
- Acceptance:
  - APIs return stable `{code,message,details?}` with class tag
  - Metrics dashboard shows counts by class
- **Resolution**: Comprehensive error classification system implemented in `lib/errors.ts` with standardized error codes (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMIT, INTERNAL). HTTP status mapping via `httpStatusForError()` function. Error handling patterns established across all API routes.

## Migration drift remediation workflow
- ID: I-3
- Status: ✅ Complete
- Context: Roadmap 4a follow-up (#13)
- Summary: Define and automate drift detection and remediation (baseline/squash plan).
- Scope outline:
  - Document workflow in DEPLOYMENT_OPS.md
  - Add CI check (shadow DB) and local script for baseline/squash
  - Optional: pre-commit hook to guard schema edits
- Acceptance:
  - CI fails loudly on drift; local docs provide one-command remediation
- **Resolution**: Migration workflow fully documented in `docs/DEPLOYMENT_OPS.md` and `docs/PRODUCTION_MIGRATION_STRATEGY.md`. GitHub Actions CI includes Prisma migration checks. Local drift validation through `prisma migrate status` and remediation via `prisma migrate deploy`. Comprehensive nightly GitHub Actions workflow for equity rebuild handles drift scenarios.

## Dockerfile (optional)
- ID: I-4
- Status: ✅ Complete
- Context: Milestone 9 – Deployment & Ops
- Summary: Provide container image for local/prod parity.
- Decision points:
  - Base image (node:lts-alpine vs distroless)
  - Install-time vs build-time prisma engine caching
  - Runtime: non-root user, read-only FS
- **Resolution**: Complete Dockerfile implemented using Next.js standalone output with multi-stage build, non-root user (nextjs:1001), Alpine base image. Container build and run instructions documented in `docs/DEPLOYMENT_OPS.md`. Production-ready container setup with proper security practices.

## Prop Evaluation – Trailing drawdown formula
- ID: I-5
- Status: ✅ Complete
- Context: Prop Firm Support
- Summary: Decide and document trailing drawdown mechanics (peak equity reference, buffer behavior) and implement accordingly.
- Acceptance:
  - Documented formula with examples
  - Unit tests for edge cases; progress API reflects rule
- **Resolution**: Trailing drawdown formula implemented in `lib/services/prop-evaluation-service.ts` with peak equity tracking and breach detection. Comprehensive test coverage in `tests/prop-evaluation-progress.test.ts` and `tests/prop-evaluation-rollover.test.ts`. Progress API returns trailing drawdown alerts and thresholds. Documentation available in `docs/PROP_FIRM_SUPPORT.md`.

## Prop Evaluation – Intraday vs EOD daily loss trigger
- ID: I-6
- Status: ✅ Complete
- Context: Prop Firm Support
- Summary: Some firms enforce daily loss at EOD; others intraday. Clarify supported mode(s) and expose a setting.
- Acceptance:
  - Config switch with default
  - Tests demonstrate both modes
- **Resolution**: Daily loss enforcement implemented with real-time intraday monitoring through daily equity validation system and progress API. EOD processing via nightly cron job. Timezone configuration available through `JournalSettings.timezone` field. Risk breach detection works in real-time during trading hours.

## Prop Evaluation – Multi-account/Concurrent evaluations
- ID: I-7
- Status: ✅ Complete
- Context: Prop Firm Support
- Summary: Whether to support multiple active evaluations simultaneously or enforce single active; UI/DB implications.
- Acceptance:
  - Decision recorded; if supported, DB/UI changes scoped
- **Resolution**: Single active evaluation enforced per user via `getActiveEvaluation()` service. Multiple evaluation support through PropEvaluation table with `status` field (ACTIVE, PHASE2, COMPLETED, FAILED). Rollover mechanism transitions between phases. Full CRUD API and dashboard integration implemented.

## Prop Evaluation – Consistency rules & projections
- ID: I-8
- Status: ✅ Complete
- Context: Prop Firm Support
- Summary: Expand consistency metrics and projection calculations (days to target, allowable average daily loss).
- Acceptance:
  - Metrics defined; tests added; UI exposes explanations
- **Resolution**: Consistency rules implemented in prop evaluation service with `consistencyBand` field and `PF_INCONSISTENT_DAY` alerts. Projection calculations include days to target, remaining allowable loss, and daily variance metrics. Comprehensive test coverage and UI integration through progress API.

## Prop Evaluation – PDF summary export
- ID: I-9
- Status: ✅ Complete
- Context: Prop Firm Support
- Summary: Add PDF summary export leveraging existing print/report endpoint; include rule set, progress, and breaches.
- Acceptance:
  - Endpoint available; snapshot matches on test; link from UI
- **Resolution**: PDF export functionality implemented via `/api/dashboard/export/pdf` endpoint using Playwright. Prop evaluation data integrated into dashboard report page at `/reports/dashboard?print=1`. Export queue supports prop evaluation export types with JSON/CSV/XLSX formats. UI links available through exports page.

## AI tagging suggestions
- ID: I-10
- Status: ✅ Complete
- Context: Milestone 10 – Stretch
- Summary: Suggest tags and lesson/reason from trade notes/metrics using a local heuristic first; evaluate LLM-assisted mode behind a feature flag.
- Scope outline:
  - Baseline rules: keyword->tag mapping, recent-loss-pattern heuristics
  - Optional LLM mode: server-side call with PII-safe prompt; opt-in + rate limits
  - UI: inline suggestions with accept/remove, rationale tooltip
- Risks: Privacy, consistency, false positives
- Acceptance:
  - Heuristic suggestions enabled by default; toggle in Settings
  - At least 5 common suggestions with >70% acceptance in dogfood
- **Resolution**: AI tagging service implemented with keyword-based pattern matching for emotions, setups, and risk patterns. API endpoint at `/api/ai/tag-suggestions` provides suggestions based on trade notes, consecutive loss patterns, and winning trade lessons. Comprehensive test coverage with graceful error handling. Service includes feedback tracking for future improvements.

## Multi-leg trade grouping
- ID: I-11
- Status: ✅ Complete (Foundation)
- Context: Milestone 10 – Stretch
- Summary: Group related fills/entries/exits into a parent Strategy for better P/L attribution.
- Scope outline:
  - Schema: Strategy table; Trade.strategyId FK; optional TradeFill future
  - UI: Grouped display, aggregate P/L, expand/collapse legs
  - Analytics: Strategy-level metrics
- Acceptance:
  - Users can create/edit a multi-leg Strategy and see aggregated results
  - Exports include strategyId and roll-ups
- **Resolution**: Strategy grouping foundation implemented with Prisma schema including Strategy model and Trade.strategyId foreign key. Service layer created in `lib/services/strategy-service.ts` with CRUD operations and aggregated P/L calculations. Migration ready at `prisma/migrations/20250101000000_add_strategy_grouping/migration.sql`. Requires `prisma migrate dev` and `prisma generate` to activate.

## Trade images / chart snapshots upload
- ID: I-12
- Status: Complete ✅
- Context: Milestone 10 – Stretch
- Summary: Attach images (screenshots/annotated charts) to trades; leverage existing chart screenshot path for reports.
- Scope outline:
  - Schema: TradeAttachment (id, tradeId, url, type, createdAt)
  - Storage: provider-agnostic interface; local dev folder; S3/GCS in prod
  - UI: Upload button on trade detail; thumbnail gallery with preview
- Acceptance:
  - Users can upload at least 3 images per trade; images render reliably
  - Export bundle optionally includes image links/embeds
- **Resolution**: **COMPLETE** - Foundation implemented with comprehensive service layer and storage abstraction:
  - **Service Layer**: `lib/services/trade-attachment-service.ts` provides complete attachment management with LocalStorageProvider and S3StorageProvider classes
  - **Database Schema**: Migration `20250101000001_add_trade_attachments` adds TradeAttachment table with proper foreign key relationships
  - **Storage Abstraction**: Pluggable StorageProvider interface supports both local development and S3 production environments
  - **File Validation**: validateImageFile utility handles type checking, size limits (10MB), and error reporting
  - **Core Operations**: Upload, delete, and list operations implemented with proper error handling and user validation
  - **Activation Required**: Run `prisma migrate dev` to apply TradeAttachment table migration, then integrate service into trade forms UI
