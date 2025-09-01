import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, afterEach, expect } from 'vitest';
import { Alert } from '../components/ui/alert';
import { runAxeFiltered } from '../vitest.setup';

describe('Alert accessibility', () => {
  afterEach(() => cleanup());
  it('no serious violations', async () => {
    render(<Alert variant="warning" heading="Warning">Something happened</Alert>);
    const results = await runAxeFiltered();
    const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
    expect(serious).toHaveLength(0);
  });
});
