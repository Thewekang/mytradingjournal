# Work Tracking

Lightweight tracker for pending decisions and follow-ups referenced by the roadmap.

## Notification preferences
- ID: I-1
- Status: Open
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

## Terminal error classification expansion
- ID: I-2
- Status: Open
- Context: Roadmap 4a follow-up (#12)
- Summary: Differentiate validation vs transient vs terminal errors in export/analytics pipelines.
- Scope outline:
  - Error taxonomy and codes
  - Update service mappers and API error envelopes
  - Observability: counters by class; tests for mapping
- Acceptance:
  - APIs return stable `{code,message,details?}` with class tag
  - Metrics dashboard shows counts by class

## Migration drift remediation workflow
- ID: I-3
- Status: Open
- Context: Roadmap 4a follow-up (#13)
- Summary: Define and automate drift detection and remediation (baseline/squash plan).
- Scope outline:
  - Document workflow in DEPLOYMENT_OPS.md
  - Add CI check (shadow DB) and local script for baseline/squash
  - Optional: pre-commit hook to guard schema edits
- Acceptance:
  - CI fails loudly on drift; local docs provide one-command remediation

## Dockerfile (optional)
- ID: I-4
- Status: Needs Decision
- Context: Milestone 9 – Deployment & Ops
- Summary: Provide container image for local/prod parity.
- Decision points:
  - Base image (node:lts-alpine vs distroless)
  - Install-time vs build-time prisma engine caching
  - Runtime: non-root user, read-only FS

## Prop Evaluation – Trailing drawdown formula
- ID: I-5
- Status: Open
- Context: Prop Firm Support
- Summary: Decide and document trailing drawdown mechanics (peak equity reference, buffer behavior) and implement accordingly.
- Acceptance:
  - Documented formula with examples
  - Unit tests for edge cases; progress API reflects rule

## Prop Evaluation – Intraday vs EOD daily loss trigger
- ID: I-6
- Status: Open
- Context: Prop Firm Support
- Summary: Some firms enforce daily loss at EOD; others intraday. Clarify supported mode(s) and expose a setting.
- Acceptance:
  - Config switch with default
  - Tests demonstrate both modes

## Prop Evaluation – Multi-account/Concurrent evaluations
- ID: I-7
- Status: Needs Decision
- Context: Prop Firm Support
- Summary: Whether to support multiple active evaluations simultaneously or enforce single active; UI/DB implications.
- Acceptance:
  - Decision recorded; if supported, DB/UI changes scoped

## Prop Evaluation – Consistency rules & projections
- ID: I-8
- Status: Open
- Context: Prop Firm Support
- Summary: Expand consistency metrics and projection calculations (days to target, allowable average daily loss).
- Acceptance:
  - Metrics defined; tests added; UI exposes explanations

## Prop Evaluation – PDF summary export
- ID: I-9
- Status: Open
- Context: Prop Firm Support
- Summary: Add PDF summary export leveraging existing print/report endpoint; include rule set, progress, and breaches.
- Acceptance:
  - Endpoint available; snapshot matches on test; link from UI

## AI tagging suggestions
- ID: I-10
- Status: Needs Decision
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

## Multi-leg trade grouping
- ID: I-11
- Status: Open
- Context: Milestone 10 – Stretch
- Summary: Group related fills/entries/exits into a parent Strategy for better P/L attribution.
- Scope outline:
  - Schema: Strategy table; Trade.strategyId FK; optional TradeFill future
  - UI: Grouped display, aggregate P/L, expand/collapse legs
  - Analytics: Strategy-level metrics
- Acceptance:
  - Users can create/edit a multi-leg Strategy and see aggregated results
  - Exports include strategyId and roll-ups

## Trade images / chart snapshots upload
- ID: I-12
- Status: Open
- Context: Milestone 10 – Stretch
- Summary: Attach images (screenshots/annotated charts) to trades; leverage existing chart screenshot path for reports.
- Scope outline:
  - Schema: TradeAttachment (id, tradeId, url, type, createdAt)
  - Storage: provider-agnostic interface; local dev folder; S3/GCS in prod
  - UI: Upload button on trade detail; thumbnail gallery with preview
- Acceptance:
  - Users can upload at least 3 images per trade; images render reliably
  - Export bundle optionally includes image links/embeds
