import { requireUser } from '../../lib/auth';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/toast-provider';
import { Dialog } from '@/components/ui/dialog';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

async function fetchTrades(query = '') {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const res = await fetch(`${base}/api/trades${query}`, { cache: 'no-store' });
  if (!res.ok) return { items: [], nextCursor: null };
  const json = await res.json();
  return json.data ?? { items: [], nextCursor: null };
}

// Next.js App Router passes `searchParams` possibly as a Promise in some edge cases during type generation (.next/types)
// Conform to Next's generated PageProps expecting an (optional) Promise for searchParams
type TradesPageProps = { searchParams?: Promise<Record<string, string | undefined>> };
export default async function TradesPage(props: TradesPageProps) {
  const raw = props.searchParams ? await props.searchParams : {};
  const user = await requireUser();
  if (!user) {
    return <div className="text-center py-20">Please sign in to view your trades.</div>;
  }
  const qp = new URLSearchParams();
  ['instrumentId','direction','status','q'].forEach(k => { const v = raw?.[k]; if (v) qp.set(k, v); });
  const data = await fetchTrades(qp.toString() ? `?${qp.toString()}` : '');
  return <TradesClient initial={data} userEmail={user.email} />;
}

// Client component
interface TradeListItem { id: string; instrumentId: string; direction: 'LONG' | 'SHORT'; entryPrice: number; exitPrice: number | null; quantity: number; status: 'OPEN' | 'CLOSED' | 'CANCELLED'; entryAt: string; exitAt: string | null; realizedPnl: number | null; tags: { tagId: string; tag?: { label: string; color: string } }[]; notes?: string | null; reason?: string | null; lesson?: string | null; deletedAt?: string | null }
function TradesClient({ initial, userEmail }: { initial: { items: TradeListItem[]; nextCursor: string|null }; userEmail: string }) {
  const [items, setItems] = React.useState(initial.items);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ instrumentId: '', direction: 'LONG', entryPrice: '', quantity: '' });
  const [error, setError] = React.useState<string|null>(null);
  const [allTags, setAllTags] = React.useState<{ id: string; label: string; color: string }[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [instruments, setInstruments] = React.useState<{ id: string; symbol: string }[]>([]);
  const [filters, setFilters] = React.useState({ instrumentId: '', direction: '', status: '', q: '' });
  const [nextCursor, setNextCursor] = React.useState<string|null>(initial.nextCursor);
  type EditingState = Omit<TradeListItem, 'exitPrice' | 'exitAt' | 'tags'> & { exitPrice: string; exitAt: string; tags: string[] };
  const [editing, setEditing] = React.useState<EditingState | null>(null);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const toast = useToast();
  const sentinelRef = React.useRef<HTMLDivElement|null>(null);
  const autoLoadingRef = React.useRef(false);
  const [errors, setErrors] = React.useState<Record<string,string>>({});
  const [editErrors, setEditErrors] = React.useState<Record<string,string>>({});

  React.useEffect(() => {
    fetch('/api/tags').then(r=>r.json()).then(j=>{
      if (j?.data) setAllTags(j.data);
    }).catch(()=>{});
    fetch('/api/instruments').then(r=>r.json()).then(j=>{
      if (j?.data) setInstruments(j.data);
    }).catch(()=>{});
  }, []);

  function onSelectTags(e: React.ChangeEvent<HTMLSelectElement>) {
    const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
    setSelectedTags(opts);
  }

  function TagChip({ label, color }: { label: string; color: string }) {
    // simple contrast: if luminance low use white else black
    const hex = color.replace('#','');
    const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
    const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
    const textColor = luminance < 0.55 ? '#fff' : '#000';
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mr-1 mb-1 inline-block" style={{ background: color, color: textColor }}>{label}</span>;
  }

  function validateCreate(values: { instrumentId: string; entryPrice: string; quantity: string }) {
    const e: Record<string,string> = {};
    if (!values.instrumentId.trim()) e.instrumentId = 'Instrument is required';
    const ep = Number(values.entryPrice); if (isNaN(ep) || ep <= 0) e.entryPrice = 'Entry must be > 0';
    const qty = Number(values.quantity); if (isNaN(qty) || qty <= 0) e.quantity = 'Qty must be > 0';
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function createTrade(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCreate(form)) return;
    setError(null); setLoading(true);
    try {
      const body = {
        instrumentId: form.instrumentId,
        direction: form.direction,
        entryPrice: Number(form.entryPrice),
        quantity: Number(form.quantity),
        entryAt: new Date().toISOString(),
        tags: selectedTags.length ? selectedTags : undefined
      };
      const res = await fetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed');
      const created = json.data;
      if (json.warning) {
        toast.push({ variant: 'warning', heading: 'Risk Warning', description: json.warning.message });
      } else {
        toast.push({ variant: 'success', heading: 'Trade Added', description: 'Trade created successfully.' });
      }
      if (selectedTags.length) {
        // Rehydrate tag objects for UI display if relation not returned
        created.tags = selectedTags.map(tid => {
          const tag = allTags.find(t => t.id === tid) || { label: tid, color: '#3b82f6' };
          return { tagId: tid, tag };
        });
      }
      setItems([created, ...items]);
      setForm({ instrumentId: '', direction: 'LONG', entryPrice: '', quantity: '' });
      setSelectedTags([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setError(msg);
      toast.push({ variant: 'danger', heading: 'Error', description: msg });
    } finally { setLoading(false); }
  }

  async function softDelete(id: string) {
    const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
    if (res.status === 204) setItems(items.map(t => t.id === id ? { ...t, deletedAt: new Date().toISOString(), status: 'CANCELLED' } : t));
  }

  async function restore(id: string) {
    const res = await fetch(`/api/trades/${id}/restore`, { method: 'POST' });
    if (res.ok) setItems(items.map(t => t.id === id ? { ...t, deletedAt: null, status: t.status === 'CANCELLED' ? 'OPEN' : t.status } : t));
  }

  async function applyFilters(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true); setError(null);
    try {
      const qp = new URLSearchParams();
      if (filters.instrumentId) qp.set('instrumentId', filters.instrumentId);
      if (filters.direction) qp.set('direction', filters.direction);
      if (filters.status) qp.set('status', filters.status);
      if (filters.q) qp.set('q', filters.q);
      const data = await fetch(`/api/trades?${qp.toString()}`);
      const json = await data.json();
      setItems(json.data.items);
      setNextCursor(json.data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  const loadMore = React.useCallback(async () => {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (filters.instrumentId) qp.set('instrumentId', filters.instrumentId);
      if (filters.direction) qp.set('direction', filters.direction);
      if (filters.status) qp.set('status', filters.status);
      if (filters.q) qp.set('q', filters.q);
      qp.set('cursor', nextCursor);
      const data = await fetch(`/api/trades?${qp.toString()}`);
      const json = await data.json();
      setItems(prev => [...prev, ...json.data.items]);
      setNextCursor(json.data.nextCursor);
    } finally { setLoading(false); }
  }, [nextCursor, filters.instrumentId, filters.direction, filters.status, filters.q]);

  // Infinite scroll: observe sentinel
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(entries => {
      const first = entries[0];
      if (first.isIntersecting && nextCursor && !loading && !autoLoadingRef.current) {
        autoLoadingRef.current = true;
        loadMore().finally(() => { autoLoadingRef.current = false; });
      }
    }, { root: null, rootMargin: '200px 0px 0px 0px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loading, filters.instrumentId, filters.direction, filters.status, filters.q, loadMore]);

  function openEdit(t: TradeListItem) {
    setEditing({ ...t, exitPrice: t.exitPrice != null ? String(t.exitPrice) : '', exitAt: t.exitAt ? t.exitAt.substring(0,16) : '', notes: t.notes ?? null, reason: t.reason ?? null, lesson: t.lesson ?? null, tags: (t.tags||[]).map(rt=>rt.tagId) });
    setEditErrors({});
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const fieldErrs: Record<string,string> = {};
  if (editing.exitPrice.trim() !== '' && (isNaN(Number(editing.exitPrice)) || Number(editing.exitPrice) <= 0)) {
      fieldErrs.exitPrice = 'Exit price must be > 0';
    }
    if (editing.exitAt && isNaN(new Date(editing.exitAt).getTime())) {
      fieldErrs.exitAt = 'Invalid date/time';
    }
    setEditErrors(fieldErrs);
    if (Object.keys(fieldErrs).length) return;
    setSavingEdit(true); setError(null);
    try {
  const payload: Record<string, unknown> = {};
  if (editing.exitPrice.trim() !== '') payload.exitPrice = Number(editing.exitPrice);
      if (editing.exitAt) payload.exitAt = new Date(editing.exitAt).toISOString();
      if (editing.notes) payload.notes = editing.notes;
      if (editing.reason) payload.reason = editing.reason;
      if (editing.lesson) payload.lesson = editing.lesson;
      if (editing.status) payload.status = editing.status;
      if (editing.tags) payload.tags = editing.tags;
      const res = await fetch(`/api/trades/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Update failed');
      // Merge updated (tags may not include nested tag info if changed; rehydrate from allTags)
      const updated = json.data;
      updated.tags = (editing.tags || []).map((tid: string) => ({ tagId: tid, tag: allTags.find(t => t.id === tid) || { label: tid, color: '#3b82f6' } }));
      setItems(list => list.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally { setSavingEdit(false); }
  }

  function closeEdit() { setEditing(null); }

  return (
  <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">Trades</h1>
  <p className="text-xs text-[var(--color-muted)]">User: {userEmail}</p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={()=>{
            const qp = new URLSearchParams();
            if (filters.instrumentId) qp.set('instrumentId', filters.instrumentId);
            if (filters.direction) qp.set('direction', filters.direction);
            if (filters.status) qp.set('status', filters.status);
            if (filters.q) qp.set('q', filters.q);
            const url = `/api/trades/export${qp.toString() ? ('?'+qp.toString()) : ''}`;
            const a = document.createElement('a');
            a.href = url; a.download = 'trades-export.csv'; a.click();
          }} className="text-[10px] px-2 py-1 rounded focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)]">Export CSV</button>
        </div>
      </div>
  <Card className="p-3 bg-[var(--color-bg-muted)] border-[color:var(--color-border)]">
  <form onSubmit={applyFilters} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs mb-1">Instrument</label>
          <Select fieldSize="sm" className="min-w-[8rem]" value={filters.instrumentId} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFilters(f=>({...f, instrumentId: e.target.value}))}>
            <option value="">All</option>
            {instruments.map(i => <option key={i.id} value={i.id}>{i.symbol}</option>)}
          </Select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs mb-1">Direction</label>
          <Select fieldSize="sm" value={filters.direction} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFilters(f=>({...f, direction: e.target.value}))}>
            <option value="">All</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </Select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs mb-1">Status</label>
          <Select fieldSize="sm" value={filters.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFilters(f=>({...f, status: e.target.value}))}>
            <option value="">All</option>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs mb-1">Search</label>
          <Input fieldSize="sm" value={filters.q} onChange={e=>setFilters(f=>({...f, q: e.target.value}))} placeholder="notes/reason" />
        </div>
  <button className="text-xs px-3 py-2 rounded bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)] disabled:opacity-60" disabled={loading}>Filter</button>
        <button type="button" onClick={()=>{setFilters({instrumentId:'', direction:'', status:'', q:''}); applyFilters();}} className="text-xs underline ml-1">Reset</button>
  </form>
  </Card>
  <Card className="p-3 bg-[var(--color-bg-muted)] border-[color:var(--color-border)]">
  <form onSubmit={createTrade} className="flex flex-wrap gap-2 items-end" noValidate>
        <div className="flex flex-col w-36">
          <label className="text-xs mb-1" htmlFor="instrumentId">Instrument ID</label>
          <input id="instrumentId" className="px-2 py-1 rounded text-sm focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" value={form.instrumentId} onChange={e=>setForm(f=>({...f, instrumentId: e.target.value}))} required aria-invalid={!!errors.instrumentId} aria-describedby={errors.instrumentId? 'instrumentId-err':undefined} />
          {errors.instrumentId && <span id="instrumentId-err" className="text-[10px] text-red-400">{errors.instrumentId}</span>}
        </div>
        <div className="flex flex-col w-28">
          <label className="text-xs mb-1" htmlFor="direction">Direction</label>
          <select id="direction" className="px-2 py-1 rounded text-sm focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" value={form.direction} onChange={e=>setForm(f=>({...f, direction: e.target.value}))}>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <div className="flex flex-col w-24">
          <label className="text-xs mb-1" htmlFor="entryPrice">Entry</label>
          <input id="entryPrice" type="number" step="0.01" className="px-2 py-1 rounded text-sm focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" value={form.entryPrice} onChange={e=>setForm(f=>({...f, entryPrice: e.target.value}))} required aria-invalid={!!errors.entryPrice} aria-describedby={errors.entryPrice? 'entryPrice-err':undefined} />
          {errors.entryPrice && <span id="entryPrice-err" className="text-[10px] text-red-400">{errors.entryPrice}</span>}
        </div>
        <div className="flex flex-col w-20">
          <label className="text-xs mb-1" htmlFor="quantity">Qty</label>
          <input id="quantity" type="number" className="px-2 py-1 rounded text-sm focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" value={form.quantity} onChange={e=>setForm(f=>({...f, quantity: e.target.value}))} required aria-invalid={!!errors.quantity} aria-describedby={errors.quantity? 'quantity-err':undefined} />
          {errors.quantity && <span id="quantity-err" className="text-[10px] text-red-400">{errors.quantity}</span>}
        </div>
        <div className="flex flex-col">
          <label className="text-xs mb-1" htmlFor="tags-select">Tags</label>
          <select id="tags-select" multiple className="min-w-[8rem] px-2 py-1 rounded text-xs h-16 focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" value={selectedTags} onChange={onSelectTags} aria-label="Select tags">
            {allTags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <Button size="sm" variant="solid" loading={loading}>{loading ? 'Saving...' : 'Add Trade'}</Button>
        {error && <span className="text-xs text-red-400 ml-2" role="alert">{error}</span>}
      </form>
      </Card>
  <div className="overflow-x-auto rounded bg-[var(--color-bg-muted)] border border-[var(--color-border)]" role="region" aria-label="Trades table">
        <Table>
          <caption className="sr-only">User trades list including instrument, direction, entry price, quantity, status, realized profit or loss, tags, and actions.</caption>
          <THead>
            <TR>
              <TH>Instrument</TH>
              <TH>Dir</TH>
              <TH>Entry</TH>
              <TH>Qty</TH>
              <TH>Status</TH>
              <TH>Realized P/L</TH>
              <TH>Tags</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {items.map(t => (
              <TR key={t.id} className={t.deletedAt ? 'opacity-50 line-through' : ''}>
                <TD className="font-mono text-xs">{t.instrumentId}</TD>
                <TD>{t.direction}</TD>
                <TD>{t.entryPrice}</TD>
                <TD>{t.quantity}</TD>
                <TD>{t.status}</TD>
                <TD className={t.realizedPnl != null ? (t.realizedPnl >= 0 ? 'text-green-400 font-mono text-xs' : 'text-red-400 font-mono text-xs') : 'font-mono text-xs'}>{t.realizedPnl != null ? t.realizedPnl.toFixed(2) : '-'}</TD>
                <TD className="max-w-[160px]">{(t.tags || []).map(rt => rt.tag ? <TagChip key={rt.tagId} label={rt.tag.label} color={rt.tag.color} /> : null)}</TD>
                <TD className="space-x-2">
                  {!t.deletedAt && <button onClick={()=>openEdit(t)} className="text-blue-400 hover:underline text-xs">Edit</button>}
                  {!t.deletedAt && <button onClick={()=>softDelete(t.id)} className="text-red-400 hover:underline text-xs">Delete</button>}
                  {t.deletedAt && <button onClick={()=>restore(t.id)} className="text-green-400 hover:underline text-xs">Restore</button>}
                </TD>
              </TR>
            ))}
            {!items.length && <TR><TD colSpan={8} className="text-center text-[var(--color-muted)] py-4">No trades yet.</TD></TR>}
          </TBody>
        </Table>
      </div>
      {nextCursor && (
        <div className="text-center flex flex-col items-center gap-2">
          <button onClick={loadMore} disabled={loading} className="mt-2 px-4 py-2 rounded text-xs bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)] disabled:opacity-60">{loading ? 'Loading...' : 'Load More'}</button>
          <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
          <p className="text-[10px] text-[var(--color-muted)]">Scrolling loads more automatically…</p>
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(o)=>{ if(!o) closeEdit(); }} title="Edit Trade">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-3 text-xs" noValidate>
            <div className="flex gap-2">
              <label className="flex-1" htmlFor="edit-exitPrice">Exit Price
                <input id="edit-exitPrice" type="number" step="0.01" value={editing.exitPrice} onChange={e=>{const val=e.target.value; setEditing(ed=> ed ? { ...ed, exitPrice: val } : ed); if (editErrors.exitPrice) setEditErrors(er=>({...er, exitPrice: ''}));}} className="mt-1 w-full px-2 py-1 rounded focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" aria-invalid={!!editErrors.exitPrice} aria-describedby={editErrors.exitPrice? 'edit-exitPrice-err':undefined} />
                {editErrors.exitPrice && <span id="edit-exitPrice-err" className="text-[10px] text-red-400">{editErrors.exitPrice}</span>}
              </label>
              <label className="flex-1" htmlFor="edit-status">Status
                <select id="edit-status" value={editing.status} onChange={e=>{const v = e.target.value as EditingState['status']; setEditing(ed=> ed ? { ...ed, status: v } : ed);}} className="mt-1 w-full px-2 py-1 rounded focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]">
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
            </div>
            <label className="block" htmlFor="edit-exitAt">Exit At
              <input id="edit-exitAt" type="datetime-local" value={editing.exitAt} onChange={e=>{const val=e.target.value; setEditing(ed=> ed ? { ...ed, exitAt: val } : ed); if (editErrors.exitAt) setEditErrors(er=>({...er, exitAt: ''}));}} className="mt-1 w-full px-2 py-1 rounded focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" aria-invalid={!!editErrors.exitAt} aria-describedby={editErrors.exitAt? 'edit-exitAt-err':undefined} />
              {editErrors.exitAt && <span id="edit-exitAt-err" className="text-[10px] text-red-400">{editErrors.exitAt}</span>}
            </label>
            <label className="block" htmlFor="edit-notes">Notes
              <textarea id="edit-notes" value={editing.notes ?? ''} onChange={e=>{const val=e.target.value; setEditing(ed=> ed ? { ...ed, notes: val } : ed);}} className="mt-1 w-full px-2 py-1 rounded h-16 focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" />
            </label>
            <label className="block" htmlFor="edit-reason">Reason
              <textarea id="edit-reason" value={editing.reason ?? ''} onChange={e=>{const val=e.target.value; setEditing(ed=> ed ? { ...ed, reason: val } : ed);}} className="mt-1 w-full px-2 py-1 rounded h-12 focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" />
            </label>
            <label className="block" htmlFor="edit-lesson">Lesson
              <textarea id="edit-lesson" value={editing.lesson ?? ''} onChange={e=>{const val=e.target.value; setEditing(ed=> ed ? { ...ed, lesson: val } : ed);}} className="mt-1 w-full px-2 py-1 rounded h-12 focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]" />
            </label>
            <label className="block" htmlFor="edit-tags">Tags
              <select id="edit-tags" multiple value={editing.tags} onChange={e=>{const vals = Array.from(e.target.selectedOptions).map(o=>o.value); setEditing(ed=> ed ? { ...ed, tags: vals } : ed);}} className="mt-1 w-full px-2 py-1 rounded h-24 focus-ring bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]">
                {allTags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeEdit} className="px-3 py-1 rounded bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)]">Cancel</button>
              <button disabled={savingEdit} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50">{savingEdit ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
