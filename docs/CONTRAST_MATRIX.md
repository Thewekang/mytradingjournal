## Contrast Matrix

Single authoritative table of current semantic token foreground vs primary surfaces. Auto-updated when tokens change.

Targets:
- Small / interactive text: ≥ 4.5:1 (AA)
- Large (≥18px or 14px bold): ≥ 3.0:1
- Non‑text UI (borders, focus ring): ≥ 3.0:1 (advisory)

| Token (FG on BG) | Dark `#0a0a0b` | Dark Alt `#141417` | Light `#f8fafc` | Light Alt `#ffffff` |
|------------------|----------------|-------------------|----------------|--------------------|
| `--color-text` | 18.00:1 | 16.73:1 | 13.98:1 | 14.63:1 |
| `--color-muted` | 7.72:1 | 7.17:1 | 7.24:1 | 7.58:1 |
| `--color-accent` | 2.95:1 | 2.74:1 | 7.80:1 | 8.16:1 |
| `--color-danger` | 4.10:1 | 3.81:1 | 4.62:1 | 4.83:1 |
| `--color-warning` | 6.21:1 | 5.77:1 | 4.80:1 | 5.02:1 |
| `--color-success` | 8.69:1 | 8.07:1 | 6.81:1 | 7.13:1 |
| `--color-info` | 4.83:1 | 4.49:1 | 7.24:1 | 7.57:1 |

# Contrast Matrix

Single authoritative table of current semantic token foreground vs primary surfaces. Auto-updated when tokens change.

Targets:
- Small / interactive text: ≥ 4.5:1 (AA)
- Large (≥18px or 14px bold): ≥ 3.0:1
- Non‑text UI (borders, focus ring): ≥ 3.0:1 (advisory)

| Token (FG on BG) | Dark `#0a0a0b` | Dark Alt `#141417` | Light `#f8fafc` | Light Alt `#ffffff` |
|------------------|----------------|-------------------|----------------|--------------------|
| `--color-text` | 18.00:1 | 16.73:1 | 13.98:1 | 14.63:1 |
| `--color-muted` | 7.72:1 | 7.17:1 | 7.24:1 | 7.58:1 |
| `--color-accent` | 2.95:1 | 2.74:1 | 7.80:1 | 8.16:1 |
| `--color-danger` | 4.10:1 | 3.81:1 | 4.62:1 | 4.83:1 |
| `--color-warning` | 6.21:1 | 5.77:1 | 4.80:1 | 5.02:1 |
| `--color-success` | 8.69:1 | 8.07:1 | 6.81:1 | 7.13:1 |
| `--color-info` | 4.83:1 | 4.49:1 | 7.24:1 | 7.57:1 |
Notes:
- Dark inline accent (2.95:1) restricted to links with underline or large text; acceptable under current usage guidelines.
- Danger meets ≥4.0:1 on dark backgrounds; small text inside deep inset panels should prefer larger size or semibold if stricter AA needed.
- Disabled ratios ~2:1 to differentiate state while preserving legibility; see interactive summary.
- Hover states: accent-hover does not improve dark inline contrast (2.27:1) so guidance identical to accent base; in light theme all hover states exceed 9:1.

### Interactive State Summary
| Pair | Dark | Light | Guidance |
|------|------|-------|----------|
| `accent → bg` | 2.95:1 | 7.80:1 | Dark usage: underline/size gate |
| `accent-fg → accent` | 6.70:1 | 8.16:1 | Pass |
| `accent-fg → accent-hover` | 8.72:1 | 9.99:1 | Pass |
| `accent-fg → danger` | 4.83:1 | 4.83:1 | Pass |
| `accent-fg → danger-hover` | 6.47:1 | 6.47:1 | Pass |
| `accent-hover → bg` | 2.27:1 | 9.55:1 | Dark: same constraints as accent |
| `disabled-text → disabled-bg` | 2.43:1 | 2.08:1 | Meets ≥2:1 advisory |
| `focus ring → bg` | 5.38:1 | 4.94:1 | Pass |

### Interactive State Contrast (Auto-Generated)

| Pair | Dark Contrast | Light Contrast | Guidance |
|------|---------------|----------------|----------|
| `--color-accent on bg` | 2.95:1 | 7.80:1 | Text target ≥4.5:1 |
| `--color-accent-foreground on --color-accent` | 6.70:1 | 8.16:1 | Text target ≥4.5:1 |
| `--color-accent-foreground on --color-accent-hover` | 8.72:1 | 9.99:1 | Text target ≥4.5:1 |
| `--color-accent-foreground on --color-danger` | 4.83:1 | 4.83:1 | Text target ≥4.5:1 |
| `--color-accent-foreground on --color-danger-hover` | 6.47:1 | 6.47:1 | Text target ≥4.5:1 |
| `--color-accent-hover on bg` | 2.27:1 | 9.55:1 | Text target ≥4.5:1 |
| `--color-disabled-text on --color-disabled-bg` | 2.43:1 | 2.08:1 | Disabled (≥2.0 suggested) |
| `--color-focus ring vs bg` | 5.38:1 | 4.94:1 | Focus ring ≥3.0:1 |
