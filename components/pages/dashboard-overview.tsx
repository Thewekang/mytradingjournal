import { format } from 'date-fns';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

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
        {stats.map(s => {
          const valueDisplay = s.label === 'Win Rate'
            ? (s.value * 100).toFixed(1) + '%'
            : (s.label.includes('P/L') || s.label.includes('Drawdown'))
              ? 'RM ' + s.value
              : s.value;
          return (
            <Card key={s.label} className="p-0">
              <CardContent className="pt-4">
                <CardTitle>{s.label}</CardTitle>
                <div className={`text-2xl font-semibold leading-snug ${s.variant === 'profit' ? 'text-green-400' : s.variant === 'drawdown' ? 'text-red-400' : ''}`}>{valueDisplay}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
        <div className="grid gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-muted)]/40 px-4 py-3 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">FCPO #{i}</span>
                <span className="text-xs text-[var(--color-muted)]">{format(new Date(), 'MMM d, yyyy')}</span>
              </div>
              <div className="font-semibold text-green-400">RM {(i*100).toFixed(0)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
