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
        // shadcn/ui theme colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Brand (kept for legacy usage)
        brand: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
          hover: 'var(--color-accent-hover)'
        },
        // Legacy semantic colors mapped to CSS variables (light/dark via data-theme)
        surface: 'var(--color-bg)',
        'surface-alt': 'var(--color-bg-alt)',
        'surface-muted': 'var(--color-bg-muted)',
        'surface-inset': 'var(--color-bg-inset)',
        text: 'var(--color-text)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
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
