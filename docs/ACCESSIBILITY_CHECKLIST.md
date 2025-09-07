# Accessibility Checklist (Updated Sep 7 2025 - Focus & Motion Audit Sync)

Status legend: ✔ Done | ◐ Partial | ✖ Not Started

## Global
- ✔ Skip link present (`Skip to content`).
- ✔ Landmarks: <main>, <nav>, <header>, <footer>.
- ✔ Color contrast token baseline established (dark + light primary/alt surfaces). Automated audit enforces minima & baseline diff (see scripts/contrast-audit.mjs). Hover/disabled state sweep pending.
- ✔ Reduced motion support with `prefers-reduced-motion` override.
- ✔ Automated reduced-motion audit (`scripts/reduced-motion-audit.mjs`) with JSON artifact (`.motion/latest.json`) & allowlist update flag.
- ✔ Unified focus ring tokens & helper (`--focus-ring-width`, `--focus-ring-offset`, `.focus-ring` class) implemented.
- ✔ High contrast enhancement via `prefers-contrast: more` media query for focus outlines.

## Navigation
- ✔ NavBar links focusable and indicate current page.
- ✔ `aria-current="page"` applied to active nav links.

## Dialogs
- ✔ Focus trap, escape key, backdrop click close.
- ✔ Return focus to triggering element.

## Forms
- ✔ Labels associated (explicit `<label>` + `htmlFor`) across settings, trade create, trade edit dialog, and goals form.
- ✔ Form-level error summary component (`FormErrorSummary`) with focus redirect + per-field jump links (unit tested).
- ◐ Inline validation pattern implemented (settings, trade create/edit, goals). Remaining (future instruments & tag CRUD UI) to adopt inline + summary integration.

## Toasts / Alerts
- ✔ role=alert / status with polite vs assertive.
- ✔ aria-live regions for dynamic messages.

## Tables
- ✔ Table semantics preserved (thead/tbody/th/td).
- ✔ Caption (visually hidden) added for main trades table.

## Tabs
- ✔ Roving tabindex & aria-controls/aria-labelledby linking.
- ✔ Keyboard arrow/Home/End navigation.

## Risk Banner
- ✔ Region labeling / accessible container (aria-label) applied to breach banner component.

## Goals & Analytics
- ✔ Progress bars expose `role="progressbar"` + aria-valuenow/min/max.
- ✔ Inverse progress logic for loss cap goals (lower is better) with adjusted percentage calculation.
- ✔ Metric & goal tooltips now use custom accessible Tooltip component (keyboard focus + Escape dismiss) replacing deprecated reliance on native `title`.
- ✔ Daily green streak goal type added (consecutive positive P/L day aggregation).
- ✔ Rolling window P/L goals (configurable days) added with labeled window input.

## Next Steps
1. Finish light theme contrast hover + disabled state audit (buttons, inputs, progress) and append state ratios to `CONTRAST_MATRIX.md`.
2. Sweep any remaining `title` attributes; replace with Tooltip primitive (verify via repo-wide grep before closing task).
3. Add region landmarks or `aria-labelledby` wrappers for major dashboard analytic sections + optional jump links.
4. Playwright keyboard e2e smoke (tabs, dialog, tooltip) – unit-level tests exist; integrate minimal browser pass.
5. Tooltip usage guidelines & content-length recommendations in design system.
6. Extend reduced-motion audit to flag cumulative sequential transitions and document allowlist governance.

Completed since last update:
- High-contrast variant toggle persisted in user settings (plus `prefers-contrast: more` media adjustments).

See also: `docs/ROADMAP.md` Milestone 5a exit criteria for design-system alignment.
