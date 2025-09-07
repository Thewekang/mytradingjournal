import plugin from 'tailwindcss/plugin';

// Provides container width utilities aligned with design-system responsive layout spec.
// Usage: class="app-container" for standard page wrapper, variants app-container-tight / app-container-wide.
export default plugin(function({ addComponents }) {
  addComponents({
    '.app-container': {
      width: '100%',
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: 'var(--space-16)',
      paddingRight: 'var(--space-16)',
      maxWidth: '64rem' // ~1024px default content width
    },
    '.app-container-tight': { maxWidth: '48rem' }, // focused forms/detail
    '.app-container-wide': { maxWidth: '80rem' }, // data-dense dashboards
    '@media (min-width: 640px)': {
      '.app-container, .app-container-tight, .app-container-wide': {
        paddingLeft: 'var(--space-24)',
        paddingRight: 'var(--space-24)'
      }
    },
    '@media (min-width: 1024px)': {
      '.app-container, .app-container-tight, .app-container-wide': {
        paddingLeft: 'var(--space-32)',
        paddingRight: 'var(--space-32)'
      }
    }
  });
});
