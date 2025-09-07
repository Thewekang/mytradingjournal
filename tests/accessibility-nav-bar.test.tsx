import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { runAxeFiltered } from '../vitest.setup';
import { NavBar } from '../components/nav-bar';

// Mock next/link to avoid internal router updates outside act
vi.mock('next/link', () => ({ default: ({ children }: React.PropsWithChildren) => <a>{children}</a> }));
// Mock next/navigation usePathname
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// Mock next-auth/react including useSession to stable value (unauthenticated)
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: () => Promise.resolve(null),
  useSession: () => ({ data: null, status: 'unauthenticated', update: vi.fn() })
}));

async function runAxe() { return runAxeFiltered(document); }

describe('NavBar accessibility', () => {
  afterEach(() => cleanup());
  it('has no WCAG A/AA violations (filtered)', async () => {
    await act(async () => {
      render(<NavBar />);
    });
    const results = await runAxe();
    const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
    expect(serious).toHaveLength(0);
  });
});
