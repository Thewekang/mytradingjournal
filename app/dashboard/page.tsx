import { requireUser } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard • Trading Journal',
  description: 'Key trading metrics, performance summaries, and risk status.'
};
import { EquityCurve } from '@/components/charts/equity-curve';
import { MonthlyBars } from '@/components/charts/monthly-bars';
import { WinLossDonut } from '@/components/charts/win-loss-donut';
import { Tooltip } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { PropEvaluationCard } from '@/components/dashboard/prop-evaluation-card';

async function fetchSummary() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/summary`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()).data;
}

interface EquityPointApi { date: string; equity: number }
async function fetchEquity(): Promise<EquityPointApi[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/equity`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data?.points || [];
}

interface DailyDay { date: string; pnl: number }
async function fetchDaily(): Promise<DailyDay[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/daily?days=60`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data?.days || [];
}

interface MonthlyRow { month: string; pnl: number }
async function fetchMonthly(): Promise<MonthlyRow[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/monthly?months=12`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data?.months || [];
}

interface Distribution { wins: number; losses: number; breakeven: number; winRate: number }
async function fetchDistribution(): Promise<Distribution | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/distribution`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

interface Drawdown { maxDrawdown: number }
async function fetchDrawdown(): Promise<Drawdown | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/drawdown`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

interface TagPerf { tagId: string; label: string; color: string; trades: number; wins: number; losses: number; winRate: number; sumPnl: number; avgPnl: number }
async function fetchTagPerformance(): Promise<TagPerf[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/analytics/tag-performance`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data?.tags || [];
}

interface GoalRow { id: string; type: string; period: string; targetValue: number; currentValue: number; achievedAt: string | null }
async function fetchGoals(): Promise<GoalRow[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/goals`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

interface RiskBreach { id: string; type: string; message: string; value: number; limit: number; createdAt: string }
async function fetchRiskBreaches(): Promise<RiskBreach[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/risk/breaches`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return <div className="p-8 text-center">Sign in required.</div>;
  const [equityRaw, summary, daily, monthly, distribution, drawdown, tagPerf, goals, breaches] = await Promise.all([fetchEquity(), fetchSummary(), fetchDaily(), fetchMonthly(), fetchDistribution(), fetchDrawdown(), fetchTagPerformance(), fetchGoals(), fetchRiskBreaches()]);
  // Adapt to chart's EquityPoint { time, equity, pnl, tradeId }
  const points = equityRaw.map(p => ({ time: p.date, equity: p.equity, pnl: 0, tradeId: '' }));
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
      <section aria-labelledby="prop-eval-heading">
        <h2 id="prop-eval-heading" className="text-sm font-semibold text-[var(--color-text)]/80 mb-2">Prop Firm Evaluation</h2>
        <PropEvaluationCard />
      </section>
    <section aria-labelledby="goals-heading" className="mt-4">
  <h2 id="goals-heading" className="text-sm font-semibold text-[var(--color-text)]/80 mb-2">Active Goals</h2>
  {goals.length === 0 && <p className="text-xs text-[var(--color-muted)]">No active goals. Create one via API (UI form pending).</p>}
    <div className="space-y-2">
          {goals.map((g: GoalRow) => {
            const pct = g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0;
            const achieved = g.achievedAt != null;
            const label = g.type === 'TOTAL_PNL' ? 'Total P/L' : g.type === 'TRADE_COUNT' ? 'Trade Count' : 'Win Rate %';
            return (
      <Card key={g.id} className="p-3" muted>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[var(--color-text)]/80">{label} ({g.period})</span>
                  <span className="text-[var(--color-muted)]">{g.currentValue.toFixed(2)} / {g.targetValue}</span>
                </div>
                <div
                  className="h-2 rounded bg-[var(--color-bg-inset)] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={+pct.toFixed(1)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label} progress`}
                  aria-valuetext={`${pct.toFixed(1)}%`}
                >
                  <div className="h-full transition-colors" style={{
                    width: pct + '%',
                    background: achieved ? 'var(--color-success)' : 'var(--color-accent)'
                  }} />
        </div>
        {achieved && <p className="text-[10px] text-status-success mt-1">Achieved</p>}
      </Card>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="risk-heading">
  <h2 id="risk-heading" className="text-sm font-semibold text-[var(--color-text)]/80 mb-2">Risk Breaches (Today)</h2>
  {breaches.length === 0 && <p className="text-xs text-[var(--color-muted)]">No breaches logged today.</p>}
        <ul className="space-y-2">
          {breaches.map((b: RiskBreach) => (
    <Card key={b.id} className="p-2 text-[11px]" muted>
              <div className="flex justify-between">
                <span className="font-medium text-status-danger">{b.type}</span>
                <time className="text-[var(--color-muted)]" dateTime={b.createdAt}>{new Date(b.createdAt).toLocaleTimeString()}</time>
              </div>
              <p className="text-[var(--color-text)]/80 mt-1">{b.message}</p>
              <p className="text-[var(--color-muted)] mt-1">Value: {b.value.toFixed(2)} / Limit: {b.limit}</p>
    </Card>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Equity Curve</h2>
  <Card className="p-4" muted>
          <EquityCurve points={points} />
          {!points.length && <p className="text-xs text-[var(--color-muted)] mt-2">No closed trades yet.</p>}
    </Card>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Monthly Performance (Last 12 Months)</h2>
  <Card className="p-4" muted>
          <MonthlyBars data={monthly} />
          {!monthly.length && <p className="text-xs text-[var(--color-muted)] mt-2">No closed trades in range.</p>}
    </Card>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Win / Loss Distribution</h2>
  <Card className="p-4 flex flex-col sm:flex-row gap-4" muted>
          <div className="flex-1 min-w-[200px]"><WinLossDonut wins={distribution?.wins||0} losses={distribution?.losses||0} breakeven={distribution?.breakeven||0} /></div>
          <ul className="text-xs space-y-1">
            <li><span className="text-[var(--color-muted)]">Wins:</span> {distribution?.wins ?? 0}</li>
            <li><span className="text-[var(--color-muted)]">Losses:</span> {distribution?.losses ?? 0}</li>
            <li><span className="text-[var(--color-muted)]">Breakeven:</span> {distribution?.breakeven ?? 0}</li>
            <li><span className="text-[var(--color-muted)]">Win Rate:</span> {distribution ? (distribution.winRate * 100).toFixed(1)+'%' : '-'}</li>
          </ul>
    </Card>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Daily P/L (Last 60 Days)</h2>
  <Card className="p-4 overflow-x-auto" muted>
          <DailyHeatmap days={daily} />
          {!daily.length && <p className="text-xs text-[var(--color-muted)] mt-2">No closed trades in range.</p>}
    </Card>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Tag Performance</h2>
  <Card className="p-4 overflow-x-auto" muted>
          <TagPerformanceTable rows={tagPerf} />
          {!tagPerf.length && <p className="text-xs text-[var(--color-muted)] mt-2">No tagged closed trades.</p>}
    </Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone, tooltip }: { label: string; value: string; tone?: 'positive'|'negative'; tooltip?: string }) {
  const color = tone === 'positive' ? 'pl-positive' : tone === 'negative' ? 'pl-negative' : '';
  const LabelEl = tooltip ? (
    <Tooltip content={tooltip}>
      <span className="cursor-help inline-block">{label}</span>
    </Tooltip>
  ) : label;
  return (
    <Card className="p-4 flex flex-col gap-2" muted>
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{LabelEl}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </Card>
  );
}

function TagPerformanceTable({ rows }: { rows: { tagId: string; label: string; color: string; trades: number; wins: number; losses: number; winRate: number; sumPnl: number; avgPnl: number; }[] }) {
  if (!rows?.length) return null;
  return (
    <table className="w-full text-xs">
  <thead className="text-[var(--color-muted)] text-[10px] uppercase">
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
          const tone = r.sumPnl > 0 ? 'pl-positive' : r.sumPnl < 0 ? 'pl-negative' : '';
          return (
            <tr key={r.tagId} className="border-t border-[var(--color-border)]">
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
        const alpha = (0.15 + 0.55*intensity).toFixed(3);
        const bg = d.pnl > 0
          ? `color-mix(in srgb, var(--color-success) ${Math.round(Number(alpha)*100)}%, transparent)`
          : d.pnl < 0
            ? `color-mix(in srgb, var(--color-danger) ${Math.round(Number(alpha)*100)}%, transparent)`
            : 'var(--color-overlay-soft)';
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
