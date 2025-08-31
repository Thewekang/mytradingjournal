"use client";
import React from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface BreachLog { id: string; type: string; message: string; createdAt: string; }

export function RiskBreachBanner() {
  const [breaches, setBreaches] = React.useState<BreachLog[]>([]);
  const [dismissed, setDismissed] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('riskBannerDismissed')||'[]'); } catch { return []; }
  });
  React.useEffect(() => {
    fetch('/api/risk/breaches').then(r=>r.json()).then(j=>{
      const today = new Date(); today.setUTCHours(0,0,0,0);
      const todayBreaches = (j.data||[]).filter((b: BreachLog) => new Date(b.createdAt) >= today && ['DAILY_LOSS'].includes(b.type));
      setBreaches(todayBreaches);
    }).catch(()=>{});
  }, []);

  function dismiss(id: string) {
    setDismissed(d=>{ const next=[...d,id]; localStorage.setItem('riskBannerDismissed', JSON.stringify(next)); return next; });
  }

  const active = breaches.filter(b => !dismissed.includes(b.id));
  if (!active.length) return null;
  return (
    <div className="sticky top-0 z-40 space-y-2 p-2 bg-[var(--color-bg)]/80 backdrop-blur">
      {active.map(b => (
        <Alert key={b.id} variant="danger" size="sm" dismissible onDismiss={()=>dismiss(b.id)} heading={
          <span className="inline-flex items-center gap-2">
            <Badge variant="danger" size="sm">DAILY LOSS</Badge>
            <span>Risk Breach</span>
          </span>
        }>
          {b.message} – Trading blocked (daily limit). Review and wait until tomorrow.
        </Alert>
      ))}
    </div>
  );
}
