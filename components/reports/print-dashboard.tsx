"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Summary = {
  totalPL: number;
  winRate: number;
  expectancy: number;
};

type TradeRow = {
  date: string;
  instrument: string;
  direction: 'LONG' | 'SHORT';
  qty: number;
  entry: number;
  exit?: number | null;
  pnl?: number | null;
};

type EquityPoint = { date: string; equity: number };

export interface PrintDashboardProps {
  summary: Summary;
  equity: EquityPoint[];
  trades: TradeRow[];
}

function formatPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function PrintDashboard({ summary, equity, trades }: PrintDashboardProps) {
  // Map equity points to a simpler x-axis label (MM-DD) for compact print
  const equitySeries = equity.map((p) => ({ x: p.date.slice(5), equity: p.equity }));

  return (
    <div className="report-root" style={{ color: 'var(--color-fg, #e5e7eb)', background: 'var(--color-bg, #0b0e14)' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .grid { gap: 10px; }
        }
        .card { background: var(--color-bg-alt, #12151b); border: 1px solid #23262d; border-radius: 8px; padding: 12px; }
        .muted { color: #9aa1ab; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #262930; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { color: #9aa1ab; font-weight: 600; }
      `}</style>
      <div className="no-print" style={{ marginBottom: 8, fontSize: 12 }}>Preview report (experimental).</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Trading Journal Report</h1>
      <div className="muted" style={{ marginBottom: 16 }}>Summary stats, equity chart, and recent trades</div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Total P/L</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>$ {summary.totalPL.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Win Rate</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatPct(summary.winRate)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Expectancy / Trade</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>$ {summary.expectancy.toFixed(1)}</div>
        </div>
      </section>

  <section className="card" style={{ marginBottom: 16 }}>
    <div className="muted" style={{ marginBottom: 6, fontWeight: 600 }}>Equity</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={equitySeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--color-border)" />
      <XAxis dataKey="x" stroke="var(--color-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
              <YAxis stroke="var(--color-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
              <Tooltip contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }} />
              <Line type="monotone" dataKey="equity" stroke="var(--color-chart-accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
    <div className="muted" style={{ marginBottom: 6, fontWeight: 600 }}>Recent Trades</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Instrument</th>
              <th>Dir</th>
              <th>Qty</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>P/L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i}>
                <td>{t.date}</td>
                <td>{t.instrument}</td>
                <td>{t.direction}</td>
                <td>{t.qty}</td>
                <td>{t.entry}</td>
                <td>{t.exit ?? '-'}</td>
                <td style={{ color: (t.pnl ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{t.pnl?.toFixed(2) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
