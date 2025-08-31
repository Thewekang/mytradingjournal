/// <reference types="vitest" />
import { render, cleanup } from '@testing-library/react';
import FormErrorSummary from '../components/form-error-summary';
import axeCore from 'axe-core';

describe('basic accessibility', () => {
  afterEach(() => cleanup());

  it('FormErrorSummary has no WCAG A/AA violations (filtered)', async () => {
    render(<FormErrorSummary errors={{ fieldA: 'Field A is required', fieldB: 'Field B must be a number' }} />);
    const results = await axeCore.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] } });
    const violations = results.violations.filter(v => v.id !== 'color-contrast');
    expect(violations).toHaveLength(0);
  });
});
