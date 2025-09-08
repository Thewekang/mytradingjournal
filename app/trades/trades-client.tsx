"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/toast-provider';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Plus, 
  Download,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface TradeListItem { 
  id: string; 
  instrumentId: string; 
  direction: 'LONG' | 'SHORT'; 
  entryPrice: number; 
  exitPrice: number | null; 
  quantity: number; 
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'; 
  entryAt: string; 
  exitAt: string | null; 
  realizedPnl: number | null; 
  tags: { tagId: string; tag?: { label: string; color: string } }[]; 
  notes?: string | null; 
  reason?: string | null; 
  lesson?: string | null; 
  deletedAt?: string | null 
}

interface TradesClientProps {
  initial: { items: TradeListItem[]; nextCursor: string|null };
  userEmail: string;
}

export function TradesClient({ initial, userEmail }: TradesClientProps) {
  const [items, setItems] = React.useState(initial.items);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ instrumentId: '', direction: 'LONG', entryPrice: '', quantity: '', reason: '' });
  const [error, setError] = React.useState<string|null>(null);
  const [allTags, setAllTags] = React.useState<{ id: string; label: string; color: string }[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [instruments, setInstruments] = React.useState<{ id: string; symbol: string }[]>([]);
  const [filters, setFilters] = React.useState({ instrumentId: '', direction: '', status: '', q: '' });
  const [nextCursor, setNextCursor] = React.useState<string|null>(initial.nextCursor);
  const toast = useToast();
  const sentinelRef = React.useRef<HTMLDivElement|null>(null);
  const autoLoadingRef = React.useRef(false);
  const [errors, setErrors] = React.useState<Record<string,string>>({});
  // Reason presets (local-only, per-device)
  const [reasonPresets, setReasonPresets] = React.useState<string[]>([]);
  const PRESETS_KEY = 'mtj_reason_presets_v1';
  React.useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PRESETS_KEY) : null;
      if (raw) setReasonPresets(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []);
    } catch { /* ignore localStorage/JSON errors */ }
  }, []);
  function savePresets(next: string[]) {
    const uniq = Array.from(new Set(next.map(s => s.trim()).filter(Boolean))).slice(0, 20);
    setReasonPresets(uniq);
  try { if (typeof window !== 'undefined') window.localStorage.setItem(PRESETS_KEY, JSON.stringify(uniq)); } catch { /* ignore quota errors */ }
  }
  function addPreset(p: string) {
    const v = p.trim();
    if (!v) return;
    if (v.length > 1000) return; // match reason max length
    savePresets([v, ...reasonPresets]);
  }
  function removePreset(p: string) {
    savePresets(reasonPresets.filter(x => x !== p));
  }

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
    // Using elevation-1 subtle shadow for tag legibility; consider semantic token if specialized.
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mr-1 mb-1 inline-block text-[var(--color-accent-foreground)] shadow-[var(--elevation-1)]" style={{ background: color }}>{label}</span>;
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
        tags: selectedTags.length ? selectedTags : undefined,
        reason: form.reason.trim() ? form.reason.trim() : undefined
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
          const tag = allTags.find(t => t.id === tid) || { label: tid, color: 'var(--color-accent)' };
          return { tagId: tid, tag };
        });
      }
      setItems([created, ...items]);
      setForm({ instrumentId: '', direction: 'LONG', entryPrice: '', quantity: '', reason: '' });
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

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container-responsive space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Trades</h1>
            <p className="text-muted-foreground">Manage and analyze your trading positions • {userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={()=>{
                const qp = new URLSearchParams();
                if (filters.instrumentId) qp.set('instrumentId', filters.instrumentId);
                if (filters.direction) qp.set('direction', filters.direction);
                if (filters.status) qp.set('status', filters.status);
                if (filters.q) qp.set('q', filters.q);
                const url = `/api/trades/export${qp.toString() ? ('?'+qp.toString()) : ''}`;
                const a = document.createElement('a');
                a.href = url; a.download = 'trades-export.csv'; a.click();
              }} 
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Trade
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
          <form onSubmit={applyFilters} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Instrument</label>
                <select 
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                  value={filters.instrumentId} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFilters(f=>({...f, instrumentId: e.target.value}))}
                >
                  <option value="">All Instruments</option>
                  {instruments.map(i => <option key={i.id} value={i.id}>{i.symbol}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Direction</label>
                <select 
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.direction} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFilters(f=>({...f, direction: e.target.value}))}
                >
                  <option value="">All Directions</option>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select 
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.status} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setFilters(f=>({...f, status: e.target.value}))}
                >
                  <option value="">All Status</option>
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className="pl-10" 
                    value={filters.q} 
                    onChange={e=>setFilters(f=>({...f, q: e.target.value}))} 
                    placeholder="Search notes, reason..." 
                  />
                </div>
              </div>
              
              <div className="flex items-end gap-2">
                <Button 
                  disabled={loading}
                >
                  Apply Filters
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={()=>{setFilters({instrumentId:'', direction:'', status:'', q:''}); applyFilters();}} 
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>
        </div>
        
        {/* Add Trade Form */}
        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Add New Trade</h3>
          </div>
          
          <form onSubmit={createTrade} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="instrumentId">Instrument</label>
                <Input 
                  id="instrumentId" 
                  value={form.instrumentId} 
                  onChange={e=>setForm(f=>({...f, instrumentId: e.target.value}))} 
                  placeholder="e.g. AAPL, TSLA"
                  required 
                  aria-invalid={!!errors.instrumentId} 
                  aria-describedby={errors.instrumentId? 'instrumentId-err':undefined} 
                />
                {errors.instrumentId && <span id="instrumentId-err" className="text-sm text-destructive">{errors.instrumentId}</span>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="direction">Direction</label>
                <select 
                  id="direction" 
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                  value={form.direction} 
                  onChange={e=>setForm(f=>({...f, direction: e.target.value}))}
                >
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="entryPrice">Entry Price</label>
                <Input 
                  id="entryPrice" 
                  type="number" 
                  step="0.01" 
                  value={form.entryPrice}
                  onChange={e=>setForm(f=>({...f, entryPrice: e.target.value}))} 
                  placeholder="0.00"
                  required 
                  aria-invalid={!!errors.entryPrice} 
                  aria-describedby={errors.entryPrice? 'entryPrice-err':undefined} 
                />
                {errors.entryPrice && <span id="entryPrice-err" className="text-sm text-destructive">{errors.entryPrice}</span>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="quantity">Quantity</label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={form.quantity} 
                  onChange={e=>setForm(f=>({...f, quantity: e.target.value}))} 
                  placeholder="100"
                  required 
                  aria-invalid={!!errors.quantity} 
                  aria-describedby={errors.quantity? 'quantity-err':undefined} 
                />
                {errors.quantity && <span id="quantity-err" className="text-sm text-destructive">{errors.quantity}</span>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="tags-select">Tags</label>
                <select 
                  id="tags-select" 
                  multiple 
                  className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={selectedTags} 
                  onChange={onSelectTags} 
                  aria-label="Select tags"
                >
                  {allTags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reason">Trading Reason</label>
                {/* Presets row */}
                <div className="flex flex-wrap gap-2 mb-2" aria-label="Reason presets">
                  {reasonPresets.map(p => (
                    <div key={p} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm border border-primary/20">
                      <button type="button" onClick={()=>setForm(f=>({...f, reason: p}))} className="hover:underline">
                        {p}
                      </button>
                      <button 
                        type="button" 
                        aria-label={`Remove preset ${p}`} 
                        onClick={()=>removePreset(p)} 
                        className="opacity-60 hover:opacity-100 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {!reasonPresets.length && <span className="text-sm text-muted-foreground">No presets yet</span>}
                </div>
                <textarea 
                  id="reason" 
                  value={form.reason} 
                  onChange={e=>setForm(f=>({...f, reason: e.target.value}))} 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[5rem]" 
                  placeholder="e.g. Breakout pattern, momentum trade, earnings play..."
                />
                <div className="flex gap-3 text-sm">
                  <button 
                    type="button" 
                    onClick={()=>addPreset(form.reason)} 
                    className="text-primary hover:underline disabled:opacity-50" 
                    disabled={!form.reason.trim()}
                  >
                    Save as preset
                  </button>
                  <span className="text-muted-foreground">Presets are saved locally</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button size="sm" disabled={loading}>
                {loading ? 'Adding Trade...' : 'Add Trade'}
              </Button>
            </div>
            
            {error && <div className="text-sm text-destructive text-center" role="alert">{error}</div>}
          </form>
        </div>

        {/* Trades Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground">Your Trades</h3>
            <p className="text-sm text-muted-foreground mt-1">{items.length} trade{items.length !== 1 ? 's' : ''} found</p>
          </div>
          
          <div className="overflow-x-auto" role="region" aria-label="Trades table">
            <Table>
              <caption className="sr-only">
                User trades list including instrument, direction, entry price, quantity, status, realized profit or loss, tags, and actions.
              </caption>
              <THead>
                <TR>
                  <TH className="text-left">Instrument</TH>
                  <TH className="text-center">Direction</TH>
                  <TH className="text-right">Entry Price</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-center">Status</TH>
                  <TH className="text-right">P/L</TH>
                  <TH className="text-left">Tags</TH>
                  <TH className="text-center">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map(t => (
                  <TR key={t.id} className={`hover:bg-muted/50 ${t.deletedAt ? 'opacity-50' : ''}`}>
                    <TD className="font-mono font-semibold text-foreground">{t.instrumentId}</TD>
                    <TD className="text-center">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${t.direction === 'LONG' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                      `}>
                        {t.direction}
                      </span>
                    </TD>
                    <TD className="text-right font-mono text-foreground">{t.entryPrice}</TD>
                    <TD className="text-right font-mono text-foreground">{t.quantity}</TD>
                    <TD className="text-center">
                      <div className="flex items-center justify-center">
                        {t.status === 'OPEN' && <Clock className="w-4 h-4 text-blue-400 mr-1" />}
                        {t.status === 'CLOSED' && <CheckCircle className="w-4 h-4 text-green-400 mr-1" />}
                        {t.status === 'CANCELLED' && <AlertCircle className="w-4 h-4 text-red-400 mr-1" />}
                        <span className={`
                          text-xs font-medium
                          ${t.status === 'OPEN' ? 'text-blue-400' : ''}
                          ${t.status === 'CLOSED' ? 'text-green-400' : ''}
                          ${t.status === 'CANCELLED' ? 'text-red-400' : ''}
                        `}>
                          {t.status}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-right">
                      {t.realizedPnl != null ? (
                        <span className={`font-mono font-bold ${t.realizedPnl >= 0 ? 'profit' : 'loss'}`}>
                          {t.realizedPnl >= 0 ? '+' : ''}RM {Math.abs(t.realizedPnl).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TD>
                    <TD className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {(t.tags || []).map(rt => rt.tag ? <TagChip key={rt.tagId} label={rt.tag.label} color={rt.tag.color} /> : null)}
                      </div>
                    </TD>
                    <TD className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!t.deletedAt && (
                          <>
                            <button 
                              type="button" 
                              onClick={()=>{/* Edit functionality temporarily disabled */}} 
                              className="text-blue-400 hover:text-blue-300 text-xs" 
                              aria-label={`Edit trade ${t.instrumentId}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={()=>softDelete(t.id)} 
                              className="text-red-400 hover:text-red-300 text-xs ml-2" 
                              aria-label={`Delete trade ${t.instrumentId}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {t.deletedAt && (
                          <button 
                            type="button" 
                            onClick={()=>restore(t.id)} 
                            className="text-green-400 hover:text-green-300 text-xs" 
                            aria-label={`Restore trade ${t.instrumentId}`}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          
          {loading && nextCursor && (
            <div className="p-4 text-center">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading more trades...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
