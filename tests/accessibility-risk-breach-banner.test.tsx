import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, afterEach, expect, vi } from 'vitest';
import { RiskBreachBanner } from '../components/risk-breach-banner';
import { runAxeFiltered } from '../vitest.setup';

// Mock fetch to return a breach
const breach = { id: 'b1', type: 'DAILY_LOSS', message: 'Daily loss limit exceeded', createdAt: new Date().toISOString() };
interface MockFetchResponse { json: () => Promise<{ data: typeof breach[] }>; }
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({ data: [breach] }) } as MockFetchResponse));

// Stub localStorage for test sandbox
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined
});

describe('RiskBreachBanner accessibility', () => {
  afterEach(() => cleanup());
  it('no serious violations with active breach', async () => {
    render(<RiskBreachBanner />);
    // Wait for async effect
    await screen.findByText(/Daily loss limit exceeded/);
    const results = await runAxeFiltered();
    const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
    expect(serious).toHaveLength(0);
  });
});
