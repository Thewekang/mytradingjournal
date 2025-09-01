import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['.next/**','node_modules/**','dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn','error'] }],
      '@next/next/no-html-link-for-pages': 'off',
  // Re-enabled as error after Phase 2 typing cleanup
  '@typescript-eslint/no-explicit-any': ['error'],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node }
    }
  },
  // Allow console usage in scripts utilities
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' }
  }
];
