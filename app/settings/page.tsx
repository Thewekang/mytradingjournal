import { requireUser } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings • Trading Journal',
  description: 'Manage risk parameters, account preferences, and base configuration.'
};
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/toast-provider';

async function getSettings() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const res = await fetch(`${base}/api/settings`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) return <div className="p-6 text-center">Please sign in.</div>;
  const settings = await getSettings();
  return <SettingsClient initial={settings} />;
}

interface SettingsData { baseCurrency: string; riskPerTradePct: number; maxDailyLossPct: number; initialEquity: number; maxConsecutiveLossesThreshold: number; timezone: string }
function SettingsClient({ initial }: { initial: SettingsData | null }) {
  const [form, setForm] = React.useState({
    baseCurrency: initial?.baseCurrency ?? 'USD',
    riskPerTradePct: (initial?.riskPerTradePct ?? 1).toString(),
    maxDailyLossPct: (initial?.maxDailyLossPct ?? 3).toString(),
    initialEquity: (initial?.initialEquity ?? 100000).toString(),
    maxConsecutiveLossesThreshold: (initial?.maxConsecutiveLossesThreshold ?? 5).toString(),
    timezone: initial?.timezone ?? 'UTC'
  });
  const [locale, setLocale] = React.useState<string>('en-US');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string|null>(null);
  const [err, setErr] = React.useState<string|null>(null);
  const [errors, setErrors] = React.useState<Record<string,string>>({});
  const toast = useToast();

  function validate() {
    const e: Record<string,string> = {};
    setErrors(e); return Object.keys(e).length === 0;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setMsg(null); setErr(null);
    try {
  const payload: Record<string, unknown> = { ...form };
  (['riskPerTradePct','maxDailyLossPct','initialEquity','maxConsecutiveLossesThreshold'] as const).forEach(k => { payload[k] = Number((payload as Record<string,string>)[k]); });
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Save failed');
  setMsg('Saved');
      toast.push({ variant: 'success', heading: 'Settings Saved', description: 'Your settings have been updated.' });
  } catch (e) { const msg = e instanceof Error ? e.message : 'Save failed'; setErr(msg); toast.push({ variant: 'danger', heading: 'Save Failed', description: msg }); }
    finally { setSaving(false); }
  }

  function field<K extends keyof typeof form>(name: K, label: string, type: string = 'text', step?: string) {
    const id = `field-${name}`;
    const errMsg = errors[name as string];
    return (
      <label className="flex flex-col text-xs gap-1" key={name} htmlFor={id}>
        <span className="font-medium">{label}</span>
  <Input id={id} aria-describedby={errMsg ? id+'-err' : undefined} type={type} step={step} fieldSize="md" variant="inset" invalid={!!errMsg} value={(form as Record<string,string>)[name]} onChange={e=>setForm(f=>({...f, [name]: e.target.value}))} />
        {errMsg && <span id={id+'-err'} className="text-[10px] text-[var(--color-danger)]">{errMsg}</span>}
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card className="p-4">
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-xs">
        {field('baseCurrency','Base Currency')}
        {field('timezone','Timezone')}
        {field('riskPerTradePct','Risk % Per Trade','number','0.01')}
        {field('maxDailyLossPct','Max Daily Loss %','number','0.01')}
        {field('initialEquity','Initial Equity','number','1')}
        {field('maxConsecutiveLossesThreshold','Max Loss Streak','number','1')}
        <div className="flex flex-col text-xs gap-1">
          <span className="font-medium">Locale (display)</span>
          <select className="border rounded p-1" value={locale} onChange={(e)=>{ setLocale(e.target.value); try { document.cookie = `locale=${encodeURIComponent(e.target.value)}; path=/; max-age=${60*60*24*365}`; } catch { /* ignore */ } }}>
            <option value="en-US">English (US)</option>
          </select>
          <span className="text-[10px] text-[var(--color-muted)]">Affects number and date formatting.</span>
        </div>
        <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3 pt-2">
          <Button size="sm" variant="solid" disabled={saving} loading={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          {msg && <span className="text-status-success">{msg}</span>}
          {err && <span className="text-status-danger">{err}</span>}
        </div>
      </form>
      </Card>
  <p className="text-[10px] text-[var(--color-muted)]">Risk metrics use Initial Equity as baseline (dynamic equity implemented).</p>
    </div>
  );
}
