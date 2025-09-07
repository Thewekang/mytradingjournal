import React from 'react';
import { render, cleanup, screen, act } from '@testing-library/react';
import { describe, it, afterEach, expect, beforeAll } from 'vitest';
import { runAxeFiltered } from '../vitest.setup';

// Mock fetch to return a breach
const breach = { id: 'b1', type: 'DAILY_LOSS', message: 'Daily loss limit exceeded', createdAt: new Date().toISOString() };
interface MockFetchResponse { json: () => Promise<{ data: typeof breach[] }>; }
const fetchImpl = async () => ({ json: async () => ({ data: [breach] }) }) as MockFetchResponse;
let RiskBreachBanner: React.ComponentType;

describe('RiskBreachBanner accessibility', () => {
  beforeAll(async () => {
    // Define fetch before importing the component module
    Object.defineProperty(globalThis, 'fetch', { value: fetchImpl, configurable: true, writable: true });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'fetch', { value: fetchImpl as unknown as typeof fetch, configurable: true, writable: true });
    }
    // Minimal localStorage shim
    Object.defineProperty(globalThis, 'localStorage', { value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined
    }, configurable: true, writable: true });
    const mod = await import('../components/risk-breach-banner');
    RiskBreachBanner = mod.RiskBreachBanner;
  });
  afterEach(() => cleanup());
  it('no serious violations with active breach', async () => {
  await act(async () => { render(<RiskBreachBanner />); });
  await screen.findByText(/Daily loss limit exceeded/);
    const results = await runAxeFiltered();
    const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
    expect(serious).toHaveLength(0);
  });
});
