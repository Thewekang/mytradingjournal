"use client";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DistProps { wins: number; losses: number; breakeven: number }

const COLORS = { wins: 'var(--color-chart-positive)', losses: 'var(--color-chart-negative)', breakeven: 'var(--color-chart-neutral)' };

export function WinLossDonut({ wins, losses, breakeven }: DistProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const data = [
    { name: 'Wins', value: wins, key: 'wins', fill: COLORS.wins },
    { name: 'Losses', value: losses, key: 'losses', fill: COLORS.losses },
    { name: 'Breakeven', value: breakeven, key: 'breakeven', fill: COLORS.breakeven }
  ].filter(d => d.value > 0);
  const total = wins + losses + breakeven;
  return (
    <div className="w-full h-56 flex items-center" role="img" aria-labelledby={titleId} aria-describedby={descId}>
      <h2 id={titleId} className="sr-only">Win Loss Distribution</h2>
      <p id={descId} className="sr-only">Donut chart showing counts of winning, losing and breakeven trades.</p>
  {total === 0 ? <p className="text-xs text-[var(--color-muted)]" role="status">No closed trades.</p> : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} stroke="none" aria-label="Win loss distribution">
              {data.map((entry) => <Cell key={entry.key} fill={entry.fill} aria-label={`${entry.name}: ${entry.value}`} />)}
            </Pie>
            <Tooltip formatter={(val: unknown, name: string)=>[val as number, name] as [number,string]} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
