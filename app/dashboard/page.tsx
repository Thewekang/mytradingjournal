import { requireUser } from '@/lib/auth';
import { EquityCurve } from '@/components/charts/equity-curve';
import { MonthlyBars } from '@/components/charts/monthly-bars';
import { WinLossDonut } from '@/components/charts/win-loss-donut';
import { Tooltip } from '@/components/ui/tooltip';

async function fetchSummary() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/summary`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()).data;
}

async function fetchEquity() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/equity`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data?.points || [];
}

async function fetchDaily() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/daily?days=60`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data?.days || [];
}

async function fetchMonthly() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/monthly?months=12`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data?.months || [];
}

async function fetchDistribution() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/distribution`, { cache: 'no-store' });
  if (!res.ok) return null as any;
  const json = await res.json();
  return json.data;
}

async function fetchDrawdown() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/drawdown`, { cache: 'no-store' });
  if (!res.ok) return null as any;
  const json = await res.json();
  return json.data;
}

async function fetchTagPerformance() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/tag-performance`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data?.tags || [];
}

async function fetchGoals() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/goals`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data || [];
}

async function fetchRiskBreaches() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/risk/breaches`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data || [];
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return <div className="p-8 text-center">Sign in required.</div>;
  const [points, summary, daily, monthly, distribution, drawdown, tagPerf, goals, breaches] = await Promise.all([fetchEquity(), fetchSummary(), fetchDaily(), fetchMonthly(), fetchDistribution(), fetchDrawdown(), fetchTagPerformance(), fetchGoals(), fetchRiskBreaches()]);
  const totalPnl = points.length ? points[points.length - 1].equity : 0;
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
  <MetricCard label="Total Realized P/L" tooltip="Net realized profit (cumulative closed trade P/L)." value={`RM ${totalPnl.toFixed(2)}`} tone={totalPnl >= 0 ? 'positive' : 'negative'} />
  <MetricCard label="Win Rate" tooltip="Percentage of closed trades with positive P/L." value={summary ? (summary.winRate * 100).toFixed(1) + '%' : '-'} />
  <MetricCard label="Expectancy" tooltip="Average expected value per trade." value={summary ? summary.expectancy.toFixed(2) : '-'} tone={summary && summary.expectancy >= 0 ? 'positive' : summary ? 'negative' : undefined} />
  <MetricCard label="Profit Factor" tooltip="Gross profit ÷ gross loss." value={summary && summary.profitFactor != null ? summary.profitFactor.toFixed(2) : '-'} />
  <MetricCard label="Max Drawdown" tooltip="Peak-to-trough equity decline." value={drawdown ? `RM ${drawdown.maxDrawdown.toFixed(2)}` : '-'} tone={drawdown && drawdown.maxDrawdown === 0 ? 'positive' : undefined} />
  <MetricCard label="Avg Win/Loss Ratio" tooltip="Average winning trade size ÷ average losing trade size." value={summary && summary.avgLoss > 0 ? (summary.avgWin / summary.avgLoss).toFixed(2) : '-'} />
  <MetricCard label="Loss Streak (Cur/Max)" tooltip="Current and historical maximum consecutive losing trades." value={summary ? `${summary.currentConsecutiveLosses}/${summary.maxConsecutiveLosses}` : '-'} />
      </div>
      <section aria-labelledby="goals-heading" className="mt-4">
        <h2 id="goals-heading" className="text-sm font-semibold text-neutral-300 mb-2">Active Goals</h2>
        {goals.length === 0 && <p className="text-xs text-neutral-500">No active goals. Create one via API (UI form pending).</p>}
        <div className="space-y-2">
          {goals.map((g: any) => {
            const pct = g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0;
            const achieved = g.achievedAt != null;
            const label = g.type === 'TOTAL_PNL' ? 'Total P/L' : g.type === 'TRADE_COUNT' ? 'Trade Count' : 'Win Rate %';
            return (
              <div key={g.id} className="rounded p-2 bg-[var(--color-bg-muted)] border border-[var(--color-border-strong)]">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-300">{label} ({g.period})</span>
                  <span className="text-neutral-400">{g.currentValue.toFixed(2)} / {g.targetValue}</span>
                </div>
                <div
                  className="h-2 rounded bg-neutral-800 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={+pct.toFixed(1)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label} progress`}
                  aria-valuetext={`${pct.toFixed(1)}%`}
                >
                  <div className={`h-full ${achieved ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: pct + '%' }} />
                </div>
                {achieved && <p className="text-[10px] text-green-400 mt-1">Achieved</p>}
              </div>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="risk-heading">
        <h2 id="risk-heading" className="text-sm font-semibold text-neutral-300 mb-2">Risk Breaches (Today)</h2>
        {breaches.length === 0 && <p className="text-xs text-neutral-500">No breaches logged today.</p>}
        <ul className="space-y-2">
          {breaches.map((b: any) => (
            <li key={b.id} className="rounded p-2 text-[11px] bg-[var(--color-bg-muted)] border border-[var(--color-border-strong)]">
              <div className="flex justify-between">
                <span className="font-medium text-red-400">{b.type}</span>
                <time className="text-neutral-500" dateTime={b.createdAt}>{new Date(b.createdAt).toLocaleTimeString()}</time>
              </div>
              <p className="text-neutral-300 mt-1">{b.message}</p>
              <p className="text-neutral-500 mt-1">Value: {b.value.toFixed(2)} / Limit: {b.limit}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Equity Curve</h2>
  <div className="rounded-lg p-4 bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
          <EquityCurve points={points} />
          {!points.length && <p className="text-xs text-neutral-500 mt-2">No closed trades yet.</p>}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Monthly Performance (Last 12 Months)</h2>
  <div className="rounded-lg p-4 bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
          <MonthlyBars data={monthly} />
          {!monthly.length && <p className="text-xs text-neutral-500 mt-2">No closed trades in range.</p>}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Win / Loss Distribution</h2>
  <div className="rounded-lg p-4 flex flex-col sm:flex-row gap-4 bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
          <div className="flex-1 min-w-[200px]"><WinLossDonut wins={distribution?.wins||0} losses={distribution?.losses||0} breakeven={distribution?.breakeven||0} /></div>
          <ul className="text-xs space-y-1">
            <li><span className="text-neutral-400">Wins:</span> {distribution?.wins ?? 0}</li>
            <li><span className="text-neutral-400">Losses:</span> {distribution?.losses ?? 0}</li>
            <li><span className="text-neutral-400">Breakeven:</span> {distribution?.breakeven ?? 0}</li>
            <li><span className="text-neutral-400">Win Rate:</span> {distribution ? (distribution.winRate * 100).toFixed(1)+'%' : '-'}</li>
          </ul>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Daily P/L (Last 60 Days)</h2>
  <div className="rounded-lg p-4 overflow-x-auto bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
          <DailyHeatmap days={daily} />
          {!daily.length && <p className="text-xs text-neutral-500 mt-2">No closed trades in range.</p>}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Tag Performance</h2>
  <div className="rounded-lg p-4 overflow-x-auto bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
          <TagPerformanceTable rows={tagPerf} />
          {!tagPerf.length && <p className="text-xs text-neutral-500 mt-2">No tagged closed trades.</p>}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone, tooltip }: { label: string; value: string; tone?: 'positive'|'negative'; tooltip?: string }) {
  const color = tone === 'positive' ? 'text-green-400' : tone === 'negative' ? 'text-red-400' : '';
  const LabelEl = tooltip ? (
    <Tooltip content={tooltip}>
      <span className="cursor-help inline-block">{label}</span>
    </Tooltip>
  ) : label;
  return (
    <div className="rounded-lg p-4 flex flex-col gap-2 bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{LabelEl}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function TagPerformanceTable({ rows }: { rows: { tagId: string; label: string; color: string; trades: number; wins: number; losses: number; winRate: number; sumPnl: number; avgPnl: number; }[] }) {
  if (!rows?.length) return null;
  return (
    <table className="w-full text-xs">
      <thead className="text-neutral-400 text-[10px] uppercase">
        <tr className="text-left">
          <th className="py-1 pr-2 font-medium">Tag</th>
          <th className="py-1 pr-2 font-medium">Trades</th>
          <th className="py-1 pr-2 font-medium">Win%</th>
          <th className="py-1 pr-2 font-medium">Avg P/L</th>
          <th className="py-1 pr-2 font-medium">Total P/L</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const tone = r.sumPnl > 0 ? 'text-green-400' : r.sumPnl < 0 ? 'text-red-400' : '';
          return (
            <tr key={r.tagId} className="border-t border-neutral-800">
              <td className="py-1 pr-2"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: r.color }}></span>{r.label}</span></td>
              <td className="py-1 pr-2">{r.trades}</td>
              <td className="py-1 pr-2">{(r.winRate*100).toFixed(0)}%</td>
              <td className={`py-1 pr-2 ${tone}`}>{r.avgPnl.toFixed(2)}</td>
              <td className={`py-1 pr-2 font-medium ${tone}`}>{r.sumPnl.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DailyHeatmap({ days }: { days: { date: string; pnl: number }[] }) {
  if (!days?.length) return null;
  const values = days.map(d => d.pnl);
  const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
  return (
    <div className="grid grid-cols-7 gap-1 text-[10px]">
      {days.map(d => {
        const intensity = Math.min(1, Math.abs(d.pnl) / maxAbs);
        const bg = d.pnl > 0 ? `rgba(34,197,94,${0.15 + 0.55*intensity})` : d.pnl < 0 ? `rgba(239,68,68,${0.15 + 0.55*intensity})` : 'rgba(120,120,120,0.15)';
        return (
          <Tooltip key={d.date} content={`${d.date}: ${d.pnl.toFixed(2)}`}>
            <div
               className="rounded-sm aspect-square flex items-center justify-center font-medium cursor-help"
               style={{ background: bg }}>
              {Math.round(d.pnl)}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
