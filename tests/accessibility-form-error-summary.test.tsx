import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { runAxeFiltered } from '../vitest.setup';
import FormErrorSummary from '../components/form-error-summary';

describe('FormErrorSummary accessibility', () => {
  afterEach(() => cleanup());
  it('has no WCAG A/AA violations (filtered)', async () => {
    render(<FormErrorSummary errors={{ foo: 'Foo required', bar: 'Bar invalid' }} />);
  const results = await runAxeFiltered(document);
  // Assert no serious/critical impact violations after filtering known ignorable rules
  const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
  expect(serious).toHaveLength(0);
  });
});
