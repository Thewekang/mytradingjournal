import { render, screen } from '@testing-library/react';
import React from 'react';
import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';

// Simple smoke + semantic role checks; deeper axe tests handled in existing accessibility suite.

describe('Design system primitives a11y smoke', () => {
  it('renders surface', () => {
    render(<Surface data-testid="surf" level={1}>Content</Surface>);
    // Basic existence check without jest-dom matcher
    expect(!!screen.getByTestId('surf')).toBe(true);
  });
  it('renders skeleton (no aria noise)', () => {
    render(<Skeleton data-testid="skel" width={80} height={12} />);
    const el = screen.getByTestId('skel');
    expect(!!el).toBe(true);
    expect(el.getAttribute('role')).toBe(null);
  });
  it('renders spinner with status role', () => {
    render(<Spinner data-testid="spin" />);
    expect(!!screen.getByRole('status')).toBe(true);
  });
  it('renders determinate progress with aria-valuenow', () => {
    render(<Progress value={40} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
  });
  it('renders indeterminate progress without aria-valuenow', () => {
    render(<Progress indeterminate />);
    const bar = screen.getByRole('progressbar');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
  });
});
