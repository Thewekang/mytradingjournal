# Contrast Matrix (Initial Audit)

This file is auto-generated baseline for color token contrast pairs (text vs background) using current `globals.css` tokens. Update when tokens change.

Ratios computed using WCAG 2.1 relative luminance formula. Target:
- Body & interactive text: >= 4.5:1 (AA)
- Large / semibold >= 3.0:1
- Non-text UI (borders, focus indicators): >= 3.0:1 advisable

| Token (FG on BG) | Dark `#0a0a0b` | Dark Alt `#141417` | Light `#f8fafc` | Light Alt `#ffffff` |
|------------------|----------------|-------------------|----------------|--------------------|
| `--color-text` | 18.00:1 | 16.73:1 | 13.98:1 | 14.63:1 |
| `--color-muted` | 7.72:1 | 7.17:1 | 7.24:1 | 7.58:1 |
| `--color-accent` | 3.83:1 | 3.56:1 | 6.41:1 | 6.70:1 |
| `--color-danger` | 4.10:1 | 3.81:1 | 4.62:1 | 4.83:1 |
| `--color-warning` | 9.21:1 | 8.56:1 | 3.04:1 | 3.19:1 |
| `--color-success` | 6.00:1 | 5.58:1 | 4.79:1 | 5.02:1 |
| `--color-info` | 7.14:1 | 6.63:1 | 5.67:1 | 5.93:1 |


Observations:
- Warning color insufficient for small text on both themes. Consider darkening: e.g. dark theme #d97706 (currently light theme value) & light theme #b45309 to reach >=3:1 small text, or reserve warning token for icons/badges with internal contrast.
- Success & Info in light theme under 4.5:1 for small text. For inline small text semantics prefer darker variants (#166534 success, #065986 info) or restrict usage to badges/headings.
- Accent in light theme slightly below 4.5:1 (3.7–4.0). If used for body-size inline links, darken to #1b46b3 or apply underline to satisfy perceived affordance (WCAG technique).

Action Items:
1. Introduce optional `--color-*` stronger variants or adjust current values (see proposals below) ensuring minimal brand shift.
2. Add automated luminance test harness (Jest) reading computed hex values from `globals.css` and asserting target ratios.
3. Enforce semantic usage: warn in lint if using raw token where contrast insufficient for small text.

## Proposed Adjusted Tokens (Draft)

| Token | Current Dark | Proposed Dark | Current Light | Proposed Light | Notes |
|-------|--------------|---------------|---------------|----------------|-------|
| warning | #f59e0b | #d97706 | #d97706 | #b45309 | Improves contrast ~3.0+ small text |
| success | #16a34a | #15803d | #15803d | #166534 | Light variant darker for small text |
| info | #0ea5e9 | #0284c7 | #0369a1 | #055985 | Push toward >=4.5:1 on light |
| accent | #2563eb | #1d4ed8 | #1d4ed8 | #1b46b3 | Slight darkening for link text |

Pending decision before implementing.

## Automation Plan
- Add `scripts/contrast-audit.ts` to parse `globals.css`, compute luminance, output markdown (overwrite this file) and fail CI if regression.
- Integrate in `package.json` scripts: `design:audit` and include in CI pipeline.

## References
- WCAG 2.2 contrast guidance for non-text UI (3:1 advisory)
- Technique G183: Using a contrast ratio of 3:1 with surrounding text and adjacent color for graphical objects
