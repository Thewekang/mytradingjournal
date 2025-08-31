import { format } from 'date-fns';

export function DashboardOverview() {
  // Placeholder demo data; will source from API later
  const stats = [
    { label: 'Total P/L', value: 3100, variant: 'profit' },
    { label: 'Win Rate', value: 0.636, variant: 'neutral' },
    { label: 'Max Drawdown', value: -700, variant: 'drawdown' },
    { label: 'Total Trades', value: 11, variant: 'neutral' },
  ];

  return (
    <div className="space-y-8">
      <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-neutral-400">{s.label}</div>
            <div className={`text-2xl font-semibold ${s.variant === 'profit' ? 'text-green-400' : s.variant === 'drawdown' ? 'text-red-400' : ''}`}>{s.label === 'Win Rate' ? (s.value * 100).toFixed(1) + '%' : s.label.includes('P/L') || s.label.includes('Drawdown') ? 'RM ' + s.value : s.value}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
        <div className="grid gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">FCPO #{i}</span>
                <span className="text-xs text-neutral-400">{format(new Date(), 'MMM d, yyyy')}</span>
              </div>
              <div className="font-semibold text-green-400">RM {(i*100).toFixed(0)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
