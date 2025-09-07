"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface EquityPoint { time: string; equity: number; pnl: number; tradeId: string }

export function EquityCurve({ points }: { points: EquityPoint[] }) {
  const titleId = React.useId();
  const descId = React.useId();
  return (
    <div className="w-full h-64" role="img" aria-labelledby={titleId} aria-describedby={descId}>
      <h2 id={titleId} className="sr-only">Equity Curve</h2>
      <p id={descId} className="sr-only">Line chart showing cumulative equity over time for your closed trades.</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" hide />
            <YAxis domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} width={50} />
            <Tooltip formatter={(val: unknown, name: string)=>[val as number, name] as [number,string]} labelFormatter={(l)=>new Date(l).toLocaleString()} />
            <ReferenceLine y={0} stroke="var(--color-chart-neutral)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="equity" stroke="var(--color-chart-accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
