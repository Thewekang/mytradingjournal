"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MonthlyPoint { month: string; pnl: number }

export function MonthlyBars({ data }: { data: MonthlyPoint[] }) {
  const titleId = React.useId();
  const descId = React.useId();
  return (
    <div className="w-full h-64" role="img" aria-labelledby={titleId} aria-describedby={descId}>
      <h2 id={titleId} className="sr-only">Monthly Performance</h2>
      <p id={descId} className="sr-only">Bar chart of monthly profit and loss values. Bars above zero are gains, below zero are losses.</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={50} />
          <Tooltip formatter={(val:any)=>[val,'P/L']} />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Bar dataKey="pnl" fill="#6366f1" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
