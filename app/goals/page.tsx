import { requireUser } from '@/lib/auth';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast-provider';
import { Tooltip } from '@/components/ui/tooltip';
import FormErrorSummary from '@/components/form-error-summary';

async function fetchGoals() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/goals`, { cache: 'no-store' });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data || [];
}

export default async function GoalsPage() {
  const user = await requireUser();
  if (!user) return <div className="p-8 text-center">Sign in required.</div>;
  const goals = await fetchGoals();
  return <GoalsClient initial={goals} />;
}

function GoalsClient({ initial }: { initial: any[] }) {
  const [items, setItems] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string|null>(null);
  const [form, setForm] = React.useState({ type: 'TOTAL_PNL', period: 'MONTH', targetValue: '', startDate: '', endDate: '' });
  const [formErrors, setFormErrors] = React.useState<Record<string,string>>({});
  const toast = useToast();

  React.useEffect(() => {
    // auto date range for month if blank
    if (!form.startDate || !form.endDate) {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
      setForm(f => ({ ...f, startDate: first.toISOString().substring(0,10), endDate: last.toISOString().substring(0,10) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate() {
    const errs: Record<string,string> = {};
    if (!form.targetValue.trim()) errs.targetValue = 'Target is required';
    else if (isNaN(Number(form.targetValue)) || Number(form.targetValue) <= 0) errs.targetValue = 'Target must be > 0';
    if (!form.startDate) errs.startDate = 'Start date required';
    if (!form.endDate) errs.endDate = 'End date required';
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) errs.endDate = 'End must be after start';
    if (form.type === 'ROLLING_WINDOW_PNL') {
      const wd = Number((form as any).windowDays);
      if (!wd) errs['goal-window'] = 'Window (days) required';
      else if (wd < 1 || wd > 365) errs['goal-window'] = 'Window must be 1-365';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError(null); setLoading(true);
    try {
      const payload: any = {
        type: form.type,
        period: form.period,
        targetValue: Number(form.targetValue),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString()
      };
      if (form.type === 'ROLLING_WINDOW_PNL' && (form as any).windowDays) {
        payload.windowDays = Number((form as any).windowDays);
      }
      const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed');
      setItems(prev => [...prev, json.data]);
      toast.push({ variant: 'success', heading: 'Goal Added', description: 'Goal created successfully.' });
      setForm(f => ({ ...f, targetValue: '' }));
      setFormErrors({});
    } catch (err:any) {
      setError(err.message);
      toast.push({ variant: 'danger', heading: 'Error', description: err.message });
    } finally { setLoading(false); }
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return;
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    if (res.status === 204) {
      setItems(prev => prev.filter(g => g.id !== id));
      toast.push({ variant: 'success', heading: 'Goal Deleted', description: 'Goal removed.' });
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold mb-1">Goals</h1>
        <p className="text-xs text-neutral-400">Track performance targets. Progress updates automatically from trades.</p>
      </div>
  <Card className="p-3 text-xs bg-[var(--color-bg-muted)] border-[color:var(--color-border)]">
        <form onSubmit={createGoal} noValidate className="flex flex-wrap gap-3 items-end">
          <div className="basis-full">
            <FormErrorSummary errors={formErrors} fieldOrder={[ 'goal-type','goal-period','goal-target','goal-window','goal-start','goal-end' ]} />
          </div>
          <div className="flex flex-col">
            <label className="mb-0.5" htmlFor="goal-type">Type</label>
            <select id="goal-type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] rounded px-2 py-1 focus-ring">
              <option value="TOTAL_PNL">Total P/L</option>
              <option value="TRADE_COUNT">Trade Count</option>
              <option value="WIN_RATE">Win Rate %</option>
              <option value="PROFIT_FACTOR">Profit Factor</option>
              <option value="EXPECTANCY">Expectancy</option>
              <option value="AVG_LOSS_CAP">Avg Loss Cap</option>
              <option value="DAILY_GREEN_STREAK">Daily Green Streak</option>
              <option value="ROLLING_30D_PNL">Rolling 30D P/L (fixed)</option>
              <option value="ROLLING_WINDOW_PNL">Rolling Window P/L</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-0.5" htmlFor="goal-period">Period</label>
            <select id="goal-period" value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))} className="bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] rounded px-2 py-1 focus-ring">
              <option value="MONTH">Month</option>
              <option value="QUARTER">Quarter</option>
              <option value="YEAR">Year</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-0.5" htmlFor="goal-target">Target</label>
            <input id="goal-target" type="number" step="0.01" value={form.targetValue} onChange={e=>setForm(f=>({...f,targetValue:e.target.value}))} aria-invalid={!!formErrors.targetValue} aria-describedby={formErrors.targetValue ? 'goal-target-err':undefined} className="bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] rounded px-2 py-1 w-28 focus-ring" />
            {formErrors.targetValue && <span id="goal-target-err" className="text-[10px] text-red-400">{formErrors.targetValue}</span>}
          </div>
          {form.type === 'ROLLING_WINDOW_PNL' && (
            <div className="flex flex-col">
              <label className="mb-0.5" htmlFor="goal-window">Window (days)</label>
              <input id="goal-window" type="number" min={1} max={365} value={(form as any).windowDays || ''} onChange={e=>setForm(f=>({...f, windowDays: e.target.value }))} aria-invalid={!!formErrors['goal-window']} aria-describedby={formErrors['goal-window']? 'goal-window-err':undefined} className="bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] rounded px-2 py-1 w-24 focus-ring" />
              {formErrors['goal-window'] && <span id="goal-window-err" className="text-[10px] text-red-400">{formErrors['goal-window']}</span>}
            </div>
          )}
            <div className="flex flex-col">
              <label className="mb-0.5" htmlFor="goal-start">Start</label>
              <input id="goal-start" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} aria-invalid={!!formErrors.startDate} aria-describedby={formErrors.startDate? 'goal-start-err':undefined} className="bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] rounded px-2 py-1 focus-ring" />
              {formErrors.startDate && <span id="goal-start-err" className="text-[10px] text-red-400">{formErrors.startDate}</span>}
            </div>
            <div className="flex flex-col">
              <label className="mb-0.5" htmlFor="goal-end">End</label>
              <input id="goal-end" type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} aria-invalid={!!formErrors.endDate} aria-describedby={formErrors.endDate? 'goal-end-err':undefined} className="bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] rounded px-2 py-1 focus-ring" />
              {formErrors.endDate && <span id="goal-end-err" className="text-[10px] text-red-400">{formErrors.endDate}</span>}
            </div>
          <Button size="sm" variant="solid" loading={loading} disabled={loading}>{loading ? 'Saving...' : 'Add Goal'}</Button>
          {error && <span className="text-red-400 ml-2" role="alert">{error}</span>}
        </form>
      </Card>
  <Card className="p-3 space-y-2 bg-[var(--color-bg-muted)] border-[color:var(--color-border)]">
        {items.map(g => {
          const pctRaw = g.type === 'AVG_LOSS_CAP'
            ? (g.targetValue > 0 ? Math.min(100, (Math.max(0, g.targetValue - g.currentValue) / g.targetValue) * 100) : 0)
            : (g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0);
          const pct = Math.max(0, Math.min(100, pctRaw));
          const achieved = g.type === 'AVG_LOSS_CAP' ? (g.currentValue <= g.targetValue) : (g.currentValue >= g.targetValue);
          const label = ({
            TOTAL_PNL: 'Total P/L',
            TRADE_COUNT: 'Trade Count',
            WIN_RATE: 'Win Rate %',
            PROFIT_FACTOR: 'Profit Factor',
            EXPECTANCY: 'Expectancy',
            AVG_LOSS_CAP: 'Avg Loss Cap',
            DAILY_GREEN_STREAK: 'Daily Green Streak',
            ROLLING_30D_PNL: 'Rolling 30D P/L'
            ,ROLLING_WINDOW_PNL: 'Rolling Window P/L'
          } as Record<string,string>)[g.type] || g.type;
          const description = ({
            TOTAL_PNL: 'Net profit minus losses and fees over the period.',
            TRADE_COUNT: 'Number of trades executed.',
            WIN_RATE: 'Percentage of closed trades with positive P/L.',
            PROFIT_FACTOR: 'Gross profit divided by gross loss (higher is better).',
            EXPECTANCY: 'Average expected value per trade (risk-adjusted).',
            AVG_LOSS_CAP: 'Average loss size; target is the maximum allowed average.',
            DAILY_GREEN_STREAK: 'Consecutive days ending with net positive P/L (today-inclusive).',
            ROLLING_30D_PNL: 'Sum of closed trade P/L over the last 30 calendar days.'
            ,ROLLING_WINDOW_PNL: 'Sum of closed trade P/L over the selected rolling window length.'
          } as Record<string,string>)[g.type] || '';
          function formatValue(val: number) {
            switch (g.type) {
              case 'WIN_RATE': return val.toFixed(1) + '%';
              case 'PROFIT_FACTOR': return val === g.targetValue && g.currentValue === g.targetValue && g.currentValue >= g.targetValue ? val.toFixed(2) : val.toFixed(2);
              case 'EXPECTANCY': return val.toFixed(2);
              case 'AVG_LOSS_CAP': return val.toFixed(2);
              default: return val.toFixed(2);
            }
          }
          const currentDisplay = formatValue(g.type === 'WIN_RATE' ? g.currentValue : g.currentValue);
          const targetDisplay = formatValue(g.type === 'WIN_RATE' ? g.targetValue : g.targetValue);
          return (
            <div key={g.id} className="rounded p-3 bg-[var(--color-bg-muted)] border border-[var(--color-border-strong)]">
              <div className="flex justify-between text-xs mb-1">
                <Tooltip content={description}>
                  <span className="text-neutral-300 font-medium cursor-help">{label} ({g.period})</span>
                </Tooltip>
                <span className="text-neutral-400 font-mono">{currentDisplay} / {targetDisplay}</span>
              </div>
              <div className="h-2 rounded bg-[var(--color-bg-inset)] overflow-hidden" role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <div className={`h-full transition-all duration-300 ease-in-out ${achieved ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: pct.toFixed(2) + '%' }} />
              </div>
              <div className="flex justify-between items-center mt-1">
                {achieved ? <span className="text-[10px] text-green-400">Achieved</span> : <span className="text-[10px] text-neutral-500">In progress</span>}
                <button onClick={()=>deleteGoal(g.id)} className="text-[10px] text-red-400 hover:underline focus-ring rounded px-1">Delete</button>
              </div>
            </div>
          );
        })}
        {!items.length && <p className="text-xs text-neutral-500">No goals yet.</p>}
      </Card>
    </div>
  );
}
