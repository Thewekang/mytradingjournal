import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { runAxeFiltered } from '../vitest.setup';
import { NavBar } from '../components/nav-bar';

// Minimal mock for next/navigation usePathname
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// Mock next-auth/react for unauthenticated state by default
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), signOut: vi.fn(), getSession: () => Promise.resolve(null) }));

async function runAxe() { return runAxeFiltered(document); }

describe('NavBar accessibility', () => {
  afterEach(() => cleanup());
  it('has no WCAG A/AA violations (filtered)', async () => {
    render(<NavBar />);
  const results = await runAxe();
  const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
  expect(serious).toHaveLength(0);
  });
});
