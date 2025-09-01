/// <reference types="vitest" />
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import FormErrorSummary from '../components/form-error-summary';
import axeCore from 'axe-core';

describe('basic accessibility', () => {
  afterEach(() => cleanup());

  it('FormErrorSummary has no WCAG A/AA violations (filtered)', async () => {
    // Provide minimal document metadata to satisfy axe rules (html-has-lang, document-title)
    document.documentElement.lang = 'en';
    if (!document.title) {
      const titleEl = document.querySelector('title') || document.createElement('title');
      titleEl.textContent = 'Test';
      if (!titleEl.parentNode) document.head.appendChild(titleEl);
    }
    render(<FormErrorSummary errors={{ fieldA: 'Field A is required', fieldB: 'Field B must be a number' }} />);
    const results = await axeCore.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] } });
    const violations = results.violations.filter(v => v.id !== 'color-contrast');
    expect(violations).toHaveLength(0);
  });
});
