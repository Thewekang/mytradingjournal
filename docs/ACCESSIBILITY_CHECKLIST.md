# Accessibility Checklist (Updated Aug 31 2025)

Status legend: ✔ Done | ◐ Partial | ✖ Not Started

## Global
- ✔ Skip link present (`Skip to content`).
- ✔ Landmarks: <main>, <nav>, <header>, <footer>.
- ◐ Color contrast: dark theme AA; light theme audit in progress. Added `--color-border-strong`, `--color-bg-muted`, `--color-bg-inset`, adjusted light theme `--color-muted` for AA small text. Full token contrast matrix TBD.
- ✔ Reduced motion support with `prefers-reduced-motion` override.
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
- ◐ Inline validation pattern implemented (settings, trade create/edit, goals). Remaining (future instruments & tag CRUD UI) to adopt pattern & potential form-level summary.

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
1. Finish light theme contrast audit: validate hover + disabled states for buttons, inputs, progress bars (AA / non-text UI 3:1 guidance) & document matrix.
2. Add automated contrast & a11y regression (jest-axe / Lighthouse CI) targeting newly introduced surface tokens.
3. Implement form-level error summary component announced via `role="alert"` / `aria-live` for multi-field errors (e.g., trade edit dialog) while preserving inline field feedback.
4. Sweep remaining legacy `title` attributes (e.g., confirm none left on charts / dialogs) and replace with Tooltip where semantic explanation is needed.
5. Add region landmarks or `aria-labelledby` groups for large dashboard sections (Equity, Distribution, Daily P/L, Tag Performance) plus optional “Skip to Goals / Skip to Trades” jump links.
6. Provide user setting to enable enhanced high-contrast theme variant (toggle that forces strong borders & elevated contrast tokens).
7. Add keyboard test harness (playwright) to verify tab order & Escape closing for dialogs and tooltips.
8. Document tooltip usage guidelines (keep under 120 chars, no critical info) in design system.
