# Design System (Milestone 5a)

## Tokens

CSS variables in `globals.css` (dark default + light via `[data-theme="light"]` or system preference). Newly added contrast / surface tokens noted:
- Color: `--color-bg`, `--color-bg-alt`, `--color-bg-muted` (subtle surface), `--color-bg-inset` (input/background inset), `--color-border`, `--color-border-strong` (>=3:1 contrast boundary), `--color-text`, `--color-muted`, `--color-accent`, `--color-accent-foreground`, `--color-danger`, `--color-warning`, `--color-success`, `--color-info`, `--color-focus`.
- Radii: `--radius-xs` (2px), `--radius-sm` (4px), `--radius` (8px), `--radius-lg` (14px).
- Shadow: `--shadow-sm`, `--shadow`, `--shadow-lg`.
- Transition: `--dur-fast` (120ms), `--dur` (200ms), `--dur-slow` (320ms).
- Easing: `--ease` (cubic-bezier(.4,0,.2,1)).

### Focus & Interaction Tokens (Partial / Planned)
Current:
- `--color-focus`: focus ring color consumed via Tailwind `focus-visible:ring-[var(--color-focus)]` utilities across interactive elements (buttons, inputs, dialog close).

Planned additions:
- `--focus-ring-width` (default 2px) for consistent outline thickness.
- `--focus-ring-offset` to create a gap for high-contrast outlines on dark surfaces.
- `--focus-ring-shadow` composite for layered components (e.g. elevated cards, dialog).

Implemented:
- Added `--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-shadow` tokens.
- Introduced `.focus-ring` utility class applying tokenized box-shadow.
- High contrast enhancement via `@media (prefers-contrast: more)` increases ring prominence.

Migration Path (remaining):
1. Refactor existing components to replace individual `focus-visible:ring-*` utilities with `.focus-ring` (in progress).
2. Expose design tokens snippet in documentation site / storybook (future).
3. Provide alternate ring palette for critical actions (danger focus state) if needed.

Rationale: Centralizing focus styling improves accessibility consistency and simplifies theme audit (especially light theme contrast adjustments now in progress).

### Contrast Audit (In Progress)
Adjustments introduced:
- Added `--color-border-strong` for inputs / key delineations where subtle hairline failed 3:1 (WCAG advisory for non-text UI components) in light + dark themes.
- Added `--color-bg-muted` and `--color-bg-inset` to create layered elevation without relying solely on box shadows (improves perceptibility under high contrast modes and for users with reduced contrast sensitivity).
- Elevated light theme muted text from prior slate-500 equivalent to `--color-muted: #475569` ensuring >=4.5:1 on `--color-bg` and `--color-bg-alt` for small text.

Next steps:
1. Replace ad‑hoc usage of `bg-[var(--color-bg-alt)]` where semantic meaning implies inset field with `--color-bg-inset`.
2. Migrate input & table header borders from `--color-border` to `--color-border-strong` where current ratio < 3:1 (pending component sweep).
3. Add automated contrast regression (Lighthouse CI or jest-axe) focusing on dynamic states (hover, focus, disabled) once tooltip component added.
4. Introduce `--color-accent-hover` / `--color-danger-hover` tokens if hover adjustments reduce contrast below 4.5:1 on light theme.

## Primitives (Current)
- Button: size variants (sm, md), variant (solid, outline, ghost, danger).
- Card / Surface: neutral background, border, shadow tokens.
- Badge: semantic variants (neutral, success, danger, warning, info, accent, outline).
- Alert: semantic messaging (info, success, warning, danger) with optional dismiss.
- Dialog: accessible modal (focus trap, escape close, backdrop click, scroll lock). Added reduced‑motion compatibility.
- Tabs: roving tabindex accessible tabs (list, trigger, content).
- Table: semantic table wrappers with consistent theming classes.
- Tooltip: accessible (hover + focus, Escape dismiss) replacing native title attributes.
- Toast: live-region notifications (role=alert/status, auto-dismiss) via `ToastProvider`.

## Planned
- Toast motion refinements (spring easing + reduced motion path)
- Form error summary component (integrated with a11y tokens)
- Visual regression harness (Playwright + snapshots)

## Theming
- Dark theme is default.
- Light theme applies by setting `data-theme="light"` on `<html>` (handled by NavBar toggle) or via user system preference (auto) if not overridden.
- Future: persist user preference server-side in `JournalSettings`.

## Usage Guidelines
- Never use raw hex in components; reference semantic classes or var tokens.
- Prefer composable utilities over deeply nested custom classes.
- Maintain 4px baseline spacing (multipliers of 4).
- Badge usage: concise metadata (role, status, tag classification). Avoid paragraphs inside badges.

## Roadmap
- Add visual regression snapshots after primitives stabilized.
- Motion reduction: respect `prefers-reduced-motion` (IMPLEMENTED baseline global override; refine component-level motion later).
- Extract theme switch into dedicated `ThemeProvider` for SSR hydration safety & system preference sync.

## Accessibility
See `docs/ACCESSIBILITY_CHECKLIST.md` for current status & next steps.
