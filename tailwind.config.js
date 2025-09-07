/** Tailwind v4 config */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Brand (kept for legacy usage)
        brand: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
          hover: 'var(--color-accent-hover)'
        },
        // Semantic colors mapped to CSS variables (light/dark via data-theme)
        surface: 'var(--color-bg)',
        'surface-alt': 'var(--color-bg-alt)',
        'surface-muted': 'var(--color-bg-muted)',
        'surface-inset': 'var(--color-bg-inset)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
          hover: 'var(--color-accent-hover)'
        },
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)'
        },
        focus: 'var(--color-focus)'
      },
      // Map spacing scale to CSS variables (4px baseline)
      spacing: {
        0: 'var(--space-0)',
        0.5: 'var(--space-2)',
        1: 'var(--space-4)',
        1.5: 'var(--space-6)',
        2: 'var(--space-8)',
        3: 'var(--space-12)',
        4: 'var(--space-16)',
        5: 'var(--space-20)',
        6: 'var(--space-24)',
        8: 'var(--space-32)',
        10: 'var(--space-40)',
        12: 'var(--space-48)',
        14: 'var(--space-56)',
        16: 'var(--space-64)'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)'
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)'
      }
    }
  },
  plugins: [
    (await import('./lib/tailwind-responsive-plugin.mjs')).default,
    (await import('./lib/tailwind-semantic-plugin.mjs')).default
  ]
};
