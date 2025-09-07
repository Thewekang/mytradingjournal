# Design System (Milestone 5a) — Updated Sep 7 2025

## Tokens

All design tokens are CSS variables in `globals.css` (dark default; light overrides via `[data-theme="light"]` or system preference). Avoid referencing raw hex values inside components—only semantic tokens.

### Color (Core Semantic)
`--color-bg`, `--color-bg-alt`, `--color-bg-muted`, `--color-bg-inset`, `--color-border`, `--color-border-strong`, `--color-text`, `--color-muted`, `--color-accent`, `--color-accent-hover`, `--color-accent-foreground`, `--color-danger`, `--color-danger-hover`, `--color-warning`, `--color-success`, `--color-info`, `--color-focus`, `--color-disabled-bg`, `--color-disabled-border`, `--color-disabled-text`, `--color-overlay-soft`, `--color-backdrop`, `--color-spinner-track`, `--color-danger-border`, `--color-danger-ring`.

### Radii
`--radius-xs` (2px), `--radius-sm` (4px), `--radius` (8px), `--radius-lg` (14px).

### Spacing Scale (4px Baseline)
`--space-0` 0, `--space-2` 2px, `--space-4` 4px, `--space-6` 6px, `--space-8` 8px, `--space-12` 12px, `--space-16` 16px, `--space-20` 20px, `--space-24` 24px, `--space-32` 32px, `--space-40` 40px, `--space-48` 48px, `--space-56` 56px, `--space-64` 64px.

Usage: leverage spacing tokens for custom CSS (rare). Prefer Tailwind utilities that align with these multiples. Tokens allow future dynamic scaling.

### Typography
Font families: `--font-sans`, `--font-mono`.
Sizes: `--text-xs` 12px, `--text-sm` 14px, `--text-md` 16px, `--text-lg` 18px, `--text-xl` 20px, `--text-2xl` 24px.
Line heights: `--line-tight` 1.15, `--line-snug` 1.25, `--line-normal` 1.5, `--line-relaxed` 1.65.
Weights: `--font-weight-normal` 400, `--font-weight-medium` 500, `--font-weight-semibold` 600, `--font-weight-bold` 700.

### Elevation & Shadows
Shadow tokens: `--shadow-sm`, `--shadow`, `--shadow-lg`.
Elevation mapping: `--elevation-0` (none), `--elevation-1` (sm), `--elevation-2` (standard), `--elevation-3` (overlay). Use semantic application via upcoming `Surface` primitive or `Card` rather than direct shadows.

#### Elevation Mapping Table (Draft)
| Elevation | Token            | Example Shadow (Dark)                           | Usage Guidelines                                   |
|-----------|------------------|-------------------------------------------------|----------------------------------------------------|
| 0         | `--elevation-0`  | none                                            | Base surfaces flush with background, inset panels. |
| 1         | `--elevation-1`  | var(--shadow-sm) (1px 2px subtle)               | Cards inside primary page sections.                |
| 2         | `--elevation-2`  | var(--shadow) (medium multi-layer)              | Interactive hover state / raised actionable cards. |
| 3         | `--elevation-3`  | var(--shadow-lg) (larger spread/blur combo)     | Overlays (menus, popovers, tooltip, dialog panel). |

Dark vs Light: Light theme shadow tokens reduce opacity to avoid muddy stacking. Avoid ad-hoc `shadow-*` utilities; use `Surface level={n}` or semantic component variants. Hover elevation should not exceed +1 level (e.g., level=1 -> hover shows elevation-2).

#### Raw Shadow Usage Audit (grep summary)
Occurrences outside tokens (should be migrated / reviewed):
1. `dialog.tsx` migrated to `shadow-[var(--elevation-3)]` (previously `shadow-lg`).
2. Trades page tag chip migrated to `shadow-[var(--elevation-1)]` (previously custom glow); evaluate need for dedicated `--shadow-chip` token later.
3. Tabs trigger selected state migrated to `data-[selected=true]:shadow-[var(--elevation-1)]`.
4. Tooltip migrated to `shadow-[var(--elevation-3)]` for overlay prominence.
5. Toast provider Alert migrated to `shadow-[var(--elevation-3)]`.

Planned: introduce `--shadow-focus-ring-comp` (composited) if layered focus outlines need distinct elevation stacking above overlays.

### Motion / Timing
Durations: `--dur-fast` 120ms, `--dur` 200ms, `--dur-slow` 320ms.
Easing: `--ease` standard, `--ease-spring` for subtle entrance / emphasis.

### Focus & Interaction Tokens
`--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-shadow` plus `.focus-ring` utility.
Hover states rely on dedicated hover tokens (accent/danger) to ensure contrast remains ≥4.5:1 on light theme.

### Disabled State Tokens
`--color-disabled-bg`, `--color-disabled-border`, `--color-disabled-text` unify disabled styling (avoid random opacity-only treatment—opacity layering can harm contrast in light mode).

### Focus & Interaction Tokens (Completed Phase)
Implemented tokens & utility:
- `--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-shadow`, `--color-focus`.
- `.focus-ring` utility applied across buttons, cards (interactive), inputs, tabs triggers, tooltip triggers. Dialog close button adoption pending verification.
- High contrast enhancement via `@media (prefers-contrast: more)` increases ring prominence.

Remaining refinement (minor):
1. Verify dialog close button & any legacy interactive remnants use `.focus-ring`.
2. Alternate ring palette for destructive actions (evaluate after contrast hover sweep).
3. Add Storybook / docs snippet (deferred until visual regression harness lands).

Rationale: Centralizing focus styling improves accessibility consistency and simplifies theme audit (especially light theme contrast adjustments now in progress).

### Contrast Audit (Expanded)
Adjustments introduced:
- Added `--color-border-strong` for inputs / key delineations where subtle hairline failed 3:1 (WCAG advisory for non-text UI components) in light + dark themes.
- Added `--color-bg-muted` and `--color-bg-inset` to create layered elevation without relying solely on box shadows (improves perceptibility under high contrast modes and for users with reduced contrast sensitivity).
- Elevated light theme muted text from prior slate-500 equivalent to `--color-muted: #475569` ensuring >=4.5:1 on `--color-bg` and `--color-bg-alt` for small text.

Automation Added:
- `scripts/contrast-audit.mjs` enforces: (a) fixed per-token minima; (b) regression diff vs `.contrast/baseline.json`; (c) interactive state matrix (dark + light) for accent/danger/disabled/focus ring pairs with independent thresholds (focus ≥3:1, text ≥4.5:1, disabled ≥2.0, dark accent inline ≥2.7).
- Interactive contrast table auto-injected into `CONTRAST_MATRIX.md`; baseline gating prevents >0.15 ratio drops per pair.
- `scripts/derive-audit-pages.mjs` selectively limits page audits (axe, motion, Lighthouse) by deriving impacted pages from changed files using `changed-files-audit-map.json`.

Next steps:
1. Replace ad‑hoc usage of `bg-[var(--color-bg-alt)]` where semantic meaning implies inset field with `--color-bg-inset`.
2. Migrate any remaining table header borders from `--color-border` to `--color-border-strong` where needed.
3. Evaluate dark-theme accent contrast improvement (current baseline tolerated via relaxed thresholds for inline accents).
4. Add visual regression harness snapshot gating after token stability confirmed.

## Primitives (Current)
- Button: size variants (sm, md), variant (solid, outline, ghost, danger).
- Card: new semantic surface primitive (`Card`, `CardHeader`, `CardTitle`, `CardContent`) replacing ad‑hoc `div` with raw Tailwind colors. Uses tokenized surfaces (`--color-bg-alt`, `--color-bg-muted`, `--color-bg-inset`) and unified border tokens.
- Input: unified text / number / date input primitive with size (sm, md), variant (default/inset) and invalid state styling (token-driven). Replaces ad‑hoc `<input>` usages.
- Badge: semantic variants (neutral, success, danger, warning, info, accent, outline).
- Alert: semantic messaging (info, success, warning, danger) with optional dismiss.
- Dialog: accessible modal (focus trap, escape close, backdrop click, scroll lock). Added reduced‑motion compatibility.
- Tabs: roving tabindex accessible tabs (list, trigger, content).
- Table: semantic table wrappers with consistent theming classes.
- Tooltip: accessible (hover + focus, Escape dismiss) replacing native title attributes.
- Toast: live-region notifications (role=alert/status, auto-dismiss) via `ToastProvider`.

### Newly Added (Phase 3)
- Surface: generic elevated container with `level` (0|1|2|3|'inset'|'muted') and optional `interactive` focus/hover behavior.
- Skeleton: loading placeholder with accessible hidden state (no role; decorative) using shimmer animation (respects reduced motion).
- Spinner: semantic loading indicator (role=status) customizable size/thickness; replaces ad-hoc border spinner.
- Progress: determinate or indeterminate progress bar (`role=progressbar`) with motion token easing.

Next steps:
1. Replace remaining ad‑hoc usage of `bg-neutral-*` legacy classes with semantic surface tokens via Card / upcoming Input primitive.
2. Migrate input & table header borders from `--color-border` to `--color-border-strong` where current ratio < 3:1 (pending component sweep).
3. Add automated contrast regression (Lighthouse CI or jest-axe) focusing on dynamic states (hover, focus, disabled) once Playwright smoke harness lands.
4. Introduce `--color-accent-hover` / `--color-danger-hover` tokens if hover adjustments reduce contrast below 4.5:1 on light theme.
5. Add per-surface elevation scale documentation (mapping shadow tokens to usage levels).

### Accessibility Progress Update (Sep 7 2025)
- Skip link implemented in `layout.tsx` (visually revealed on focus).
- Unified focus ring tokens & `.focus-ring` utility applied to Button & Card primitives (in progress for remaining interactive elements).
- Next: keyboard trap & aria review for dialog / tabs before Lighthouse CI integration.
### Focus Strategy
Principles:
1. Visible: `.focus-ring` ensures ≥3:1 contrast against surface using dual layered shadow.
2. Predictable: Focus only programmatically moved for modal dialogs and skip links.
3. Return Path: Dialog restores focus to its opener (enforced by test `dialog-tabs-a11y.test.tsx`).
4. Roving Tabindex: Tabs implement arrow/Home/End navigation keeping a single tab stop.
5. Reduced Motion: Focus ring transition disabled under `prefers-reduced-motion`.

### Motion Policy
Essential motion only (progress, skeleton shimmer) with global opt‑out via media query. Decorative animations halt; future per-user override may layer an explicit data attribute.

### Contrast Regression Automation
`scripts/contrast-audit.mjs` enforces per-token minima for light/dark backgrounds (primary + alt). Thresholds purposely sit slightly below current actual ratios to allow incremental tuning without regressions.

## Planned
- Toast motion refinements (spring easing + reduced motion path)
- Visual regression harness (Playwright + snapshots)
- Dark theme accent contrast potential adjustment (raise from ~2.95 → ≥3.2 without chroma loss)

## Theming
- Dark theme is default.
- Light theme applies by setting `data-theme="light"` on `<html>` (handled by NavBar toggle) or via user system preference (auto) if not overridden.
- Future: persist user preference server-side in `JournalSettings`.

## Usage Guidelines
- Never use raw hex or raw Tailwind color utilities in components; reference semantic classes or var tokens. Enforced by ESLint `local/no-raw-colors` (error) + hex literal restriction.
- Prefer composable utilities over deeply nested custom classes.
- Maintain 4px baseline spacing (multipliers of 4).
- Badge usage: concise metadata (role, status, tag classification). Avoid paragraphs inside badges.

## Roadmap
- Add visual regression snapshots after primitives stabilized (Surface / Progress / Skeleton included).
- Motion reduction: respect `prefers-reduced-motion` (IMPLEMENTED baseline global override; refine component-level motion later).
- Extract theme switch into dedicated `ThemeProvider` for SSR hydration safety & system preference sync.

## Accessibility
See `docs/ACCESSIBILITY_CHECKLIST.md` for current status & next steps.

## Milestone 5a Remaining Exit Criteria (Snapshot Sep 5 2025)
- Light theme: finalize hover + disabled state contrast (buttons, inputs, progress) and document ratios. (IN PROGRESS – base tokens & audit table added; documenting measured ratios below.)
- Refactor: migrate dashboard cards & goals panel to `Surface`/`Card` primitives (remove legacy utility stacks).
- Responsive layout: introduce documented container widths + grid helpers (sm/md/lg/xl) and replace ad‑hoc max-w classes.
- Motion guidelines: document allowed motion types, easing tokens usage, reduced-motion alternatives.
- Automated audits: integrate contrast + a11y regression (jest-axe or Lighthouse CI) gating PRs.
	- Implemented scripts: `npm run design:audit` (contrast thresholds + regression) and `npm run audit:accessibility` (axe severe baseline gating). Combined gate: `npm run audit:gate`.
- Focus ring adoption sweep: apply `.focus-ring` utility to remaining interactive elements (inputs, tabs triggers already in progress).
- Visual regression (optional): establish Playwright snapshot baseline after refactors land.

Completion Trigger: All above items resolved + zero critical axe issues across light/dark themes → mark Milestone 5a COMPLETE in `ROADMAP.md`.

### Adoption Status (Sep 6 2025)
| Area | Status | Notes |
|------|--------|-------|
| Containers (`app-container*`) | Adopted | Root layout migrated; no remaining page-level ad-hoc max-width wrappers |
| Primitives (Card/Surface) | Broadly Adopted | Dashboard, goals, trades pages using `Card`; residual utility stacks non-blocking |
| Contrast & Axe Gate | Passing | `audit:gate` runs contrast + dark/light axe (light pass being added) |
| Focus Ring Utility | Complete | Applied to buttons, links, inline action text (Edit/Delete/Restore) |
| Motion Guidelines | Documented | Implementation examples next (dialog, card hover) |
| Visual Regression | Deferred | Optional; to follow post milestone closure |

### Interactive Contrast (Light Theme Documentation Draft)
Measured current ratios (from `scripts/contrast-audit.mjs`):
- Accent normal on `--color-bg`: 7.80:1
- Accent hover on `--color-bg`: 9.55:1 (meets ≥4.5:1)
- Disabled text on disabled bg: 2.08:1 (≥2.0 target)
- Focus ring vs bg: 4.94:1 (≥3.0 target)
- Danger foreground on danger: 4.83:1

Planned adjustments: None required for light theme; retain documentation and lock thresholds. Dark theme accent inline remains below 4.5 so usage constrained to non-body text or accompanied by underline (affordance). If future requirement demands AA for dark inline accent, darken `--color-accent` slightly and update baseline.

## Responsive Layout (Added Sep 5 2025)
Utilities introduced via `lib/tailwind-responsive-plugin.mjs`:
- `.app-container` (max-width 1024px) – default page wrapper
- `.app-container-tight` (max-width 768px) – focused forms / wizards
- `.app-container-wide` (max-width 1280px) – dense dashboards / analytics
All containers apply adaptive horizontal padding that scales at `640px` and `1024px` breakpoints using spacing tokens (`--space-16` → `--space-32`). Replace ad-hoc `mx-auto max-w-* px-*` stacks gradually with these semantic classes. Rationale: central governance over breakpoints allows future global width adjustments (e.g., expanding wide container to 1440px) without sweeping template edits.

### Grid Helpers (Planned)
- Introduce `.grid-auto-fit-[minX]` utilities for auto-fitting cards without magic numbers.
- Add semantic gap tokens (already implied by spacing scale) documentation examples.

## Motion Guidelines (Added Sep 5 2025)
Principles:
1. Purposeful: motion must communicate state (loading, progress, skeleton shimmer) or spatial relationship (dialog entrance) – never purely decorative.
2. Subtle: default durations use `--dur` (200ms) or `--dur-fast` (120ms); avoid >320ms except blocking progress overlays.
3. Accessible: all non-essential animations halt when `prefers-reduced-motion: reduce` or future `[data-reduce-motion]` attribute is present.
4. Easing: use `--ease` for standard UI transitions; reserve `--ease-spring` for emphasis (e.g., dialog scale/fade). Avoid mixing multiple easings in a single composite transition.
5. Interruptible: loading indicators (spinner, progress) should not trap focus or block interactions unless mandatory (file export overlay not currently blocking).

Do / Avoid:
- Do combine opacity + slight translate for entrances (≤8px distance).
- Avoid large parallax or continuous looping animations (besides skeleton shimmer, which pauses under reduced motion).

Reduced Motion Audit:
- `scripts/reduced-motion-audit.mjs` simulates `prefers-reduced-motion: reduce` and fails if motion-related transition durations exceed 20ms. Produces `.motion/latest.json` artifact and supports allowlist updates via `MOTION_UPDATE_ALLOWLIST=1`.

## Automated Contrast & A11y Regression (Planned Implementation Spec)
Pipeline additions:
- Add CI job running `npm run design:audit` + `npm run audit:accessibility` (existing scripts) on changed files affecting `app/**`, `components/**`, `globals.css`, tokens.
- Add Lighthouse scripted run (existing `audit:lighthouse`) for smoke pages: dashboard, trades list, goals page in both themes (theme toggle param / cookie).
- Thresholds: fail PR if any new axe violations (excluding explicit baseline items) or if contrast audit diff shows ratio regression >0.15 for any token/background pair.
- Shared page definitions centralized in `scripts/audit-pages.json` consumed by axe + motion audits (override via AUDIT_PAGES env). A selective subset is auto-derived in CI unless `FORCE_ALL=1`.
- CI entry: `npm run audit:ci` (auto installs browsers via `audit:prep`).

## Focus Ring & Color Migration Checklist (Progress Metric)
- [x] Buttons
- [x] Card interactive wrappers
- [x] Inputs
- [x] Tabs triggers
- [x] Dialog close button (test: `dialog-close-focus.test.tsx`)
- [x] Tooltip trigger fallback focus outline

Automated Verification:
- `scripts/focus-walk-check.mjs` runs a focused Vitest config (`vitest.focus.config.ts`) with a stubbed Prisma client to ensure focus-ring presence on key interactive elements.
- `scripts/migrate-colors.mjs` provides deterministic mapping from legacy utility color classes to tokenized equivalents (dry run unless `APPLY=1`). Used once to remove remaining Tailwind named color utilities; now retained for future bulk refactors.
- ESLint rule `local/no-raw-colors` escalated to error (post-migration) preventing regressions.

## Next Doc Enhancements (Deferred)
- Elevation mapping table (Surface level → shadow token → usage examples)
- Form error summary patterns (link list focus management & auto-scroll)
- Visual regression story: example baseline diff and acceptance criteria
