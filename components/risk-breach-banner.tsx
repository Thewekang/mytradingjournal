"use client";
import React from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePropEvalProgress } from '@/lib/hooks/use-prop-eval-progress';

interface BreachLog { id: string; type: string; message: string; createdAt: string; }

export function RiskBreachBanner() {
  const [breaches, setBreaches] = React.useState<BreachLog[]>([]);
  const [dismissed, setDismissed] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('riskBannerDismissed')||'[]'); } catch { return []; }
  });
  const { progress } = usePropEvalProgress(60000);
  const propAlerts = (progress?.alerts || []).filter(a => a.level !== 'INFO');
  React.useEffect(() => {
    const today = new Date(); today.setUTCHours(0,0,0,0);
    // Prefer window.fetch in JSDOM; fall back to globalThis.fetch; if absent, no-op
    type FetchHolder = { fetch?: typeof fetch };
    const f: typeof fetch | null = (typeof window !== 'undefined' && typeof (window as unknown as FetchHolder).fetch === 'function')
      ? (window as unknown as FetchHolder).fetch!
      : (typeof (globalThis as unknown as FetchHolder).fetch === 'function')
        ? (globalThis as unknown as FetchHolder).fetch!
        : null;
    if (!f) return; // testing environment without fetch: skip silently
    f('/api/risk/breaches').then(r=>r.json()).then(j=>{
      const todayBreaches = (j.data||[]).filter((b: BreachLog) => new Date(b.createdAt) >= today && ['DAILY_LOSS'].includes(b.type));
      setBreaches(todayBreaches);
    }).catch(()=>{});
  }, []);

  function dismiss(id: string) {
    setDismissed(d=>{ const next=[...d,id]; localStorage.setItem('riskBannerDismissed', JSON.stringify(next)); return next; });
  }

  const activeBreach = breaches.filter(b => !dismissed.includes(b.id));
  const showProp = propAlerts.filter(a => !dismissed.includes('prop:'+a.code));
  if (!activeBreach.length && !showProp.length) return null;
  return (
    <div className="sticky top-0 z-40 space-y-2 p-2 bg-[var(--color-bg)]/80 backdrop-blur">
      {activeBreach.map(b => (
        <Alert key={b.id} variant="danger" size="sm" dismissible onDismiss={()=>dismiss(b.id)} heading={<span className="inline-flex items-center gap-2"><Badge variant="danger" size="sm">DAILY LOSS</Badge><span>Risk Breach</span></span>}>
          {b.message} – Trading blocked (daily limit). Review and wait until tomorrow.
        </Alert>
      ))}
      {showProp.map(a => (
        <Alert key={'prop:'+a.code} variant={a.level==='BLOCK'? 'danger' : 'warning'} size="sm" dismissible onDismiss={()=>dismiss('prop:'+a.code)} heading={<span className="inline-flex items-center gap-2"><Badge variant={a.level==='BLOCK'? 'danger':'warning'} size="sm">PROP</Badge><span>Prop Evaluation</span></span>}>
          {a.message}
        </Alert>
      ))}
    </div>
  );
}
