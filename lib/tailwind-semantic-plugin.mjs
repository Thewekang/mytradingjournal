import plugin from 'tailwindcss/plugin';

// Adds semantic utilities that read from CSS variables so themes switch via [data-theme]
export default plugin(function({ addUtilities, addVariant }) {
  // Support data-theme variants (optional usage: light:..., dark:...)
  addVariant('theme-light', '&[data-theme="light"] &, [data-theme="light"] &');
  addVariant('theme-dark', '&[data-theme="dark"] &, [data-theme="dark"] &');

  addUtilities({
    // Background surfaces
    '.bg-surface': { backgroundColor: 'var(--color-bg)' },
    '.bg-surface-alt': { backgroundColor: 'var(--color-bg-alt)' },
    '.bg-surface-muted': { backgroundColor: 'var(--color-bg-muted)' },
    '.bg-surface-inset': { backgroundColor: 'var(--color-bg-inset)' },

    // Text
    '.text-body': { color: 'var(--color-text)' },
    '.text-muted': { color: 'var(--color-muted)' },

    // Borders
    '.border-default': { borderColor: 'var(--color-border)' },
    '.border-strong': { borderColor: 'var(--color-border-strong)' },

    // Accent shortcuts
    '.bg-accent': { backgroundColor: 'var(--color-accent)' },
    '.text-accent': { color: 'var(--color-accent)' },
    '.ring-focus': { boxShadow: '0 0 0 var(--focus-ring-width) var(--color-focus), 0 0 0 calc(var(--focus-ring-width) + var(--focus-ring-offset)) var(--color-bg)' }
  });
});
