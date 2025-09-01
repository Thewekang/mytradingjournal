import axeCore from 'axe-core';

// Run axe against current document limiting to WCAG A/AA rules (contrast optionally filtered by caller)
export async function runAxe({ includeContrast = false }: { includeContrast?: boolean } = {}) {
  const results = await axeCore.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] } });
  if (!includeContrast) {
    results.violations = results.violations.filter(v => v.id !== 'color-contrast');
  }
  return results;
}

export type AxeResults = Awaited<ReturnType<typeof runAxe>>;
