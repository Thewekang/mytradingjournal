import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, afterEach, expect } from 'vitest';
import { EquityCurve } from '../components/charts/equity-curve';
import { MonthlyBars } from '../components/charts/monthly-bars';
import { WinLossDonut } from '../components/charts/win-loss-donut';
import { runAxeFiltered } from '../vitest.setup';

const eqPoints = [
  { time: new Date().toISOString(), equity: 100000, pnl: 200, tradeId: 't1' },
  { time: new Date(Date.now()+3600_000).toISOString(), equity: 100400, pnl: 200, tradeId: 't2' }
];
const monthly = [
  { month: '2025-07', pnl: 500 },
  { month: '2025-08', pnl: -200 }
];

describe('Charts accessibility', () => {
  afterEach(() => cleanup());
  it('EquityCurve has no serious violations', async () => {
    render(<EquityCurve points={eqPoints} />);
    const r = await runAxeFiltered();
    expect(r.violations.filter(v => ['serious','critical'].includes(v.impact || '') )).toHaveLength(0);
  });
  it('MonthlyBars has no serious violations', async () => {
    render(<MonthlyBars data={monthly} />);
    const r = await runAxeFiltered();
    expect(r.violations.filter(v => ['serious','critical'].includes(v.impact || '') )).toHaveLength(0);
  });
  it('WinLossDonut has no serious violations', async () => {
    render(<WinLossDonut wins={5} losses={3} breakeven={1} />);
    const r = await runAxeFiltered();
    expect(r.violations.filter(v => ['serious','critical'].includes(v.impact || '') )).toHaveLength(0);
  });
});
