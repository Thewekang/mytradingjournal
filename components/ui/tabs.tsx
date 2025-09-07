"use client";
import React, { createContext, useContext, useState, ReactNode, useId, useRef } from 'react';
import clsx from 'clsx';

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  idBase: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  defaultValue: string;
  onValueChange?: (val: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, onValueChange, children, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  const idBase = useId();
  function set(v: string) {
    setValue(v);
    onValueChange?.(v);
  }
  return (
    <TabsContext.Provider value={{ value, setValue: set, idBase }}>
      <div className={clsx('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps { children: ReactNode; className?: string; }
export function TabsList({ children, className }: TabsListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const ctx = useContext(TabsContext)!;
  function focusValue(val: string) {
    ctx.setValue(val);
    // focus corresponding button
    const btn = listRef.current?.querySelector<HTMLButtonElement>(`button[data-value="${val}"]`);
    btn?.focus();
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]') || []);
    if (!tabs.length) return;
    const currentIndex = tabs.findIndex(t => t.getAttribute('data-value') === ctx.value);
    const lastIndex = tabs.length - 1;
    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % tabs.length; e.preventDefault(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length; e.preventDefault(); break;
      case 'Home':
        nextIndex = 0; e.preventDefault(); break;
      case 'End':
        nextIndex = lastIndex; e.preventDefault(); break;
      default: return;
    }
    const val = tabs[nextIndex].getAttribute('data-value');
    if (val) focusValue(val);
  }
  return <div ref={listRef} role="tablist" onKeyDown={onKeyDown} className={clsx('inline-flex bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-md p-1 gap-1', className)}>{children}</div>;
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { value: string; }
export function TabsTrigger({ value, className, children, ...rest }: TabsTriggerProps) {
  const ctx = useContext(TabsContext)!;
  const selected = ctx.value === value;
  return (
    <button
      data-value={value}
      role="tab"
      aria-selected={selected}
      aria-controls={`${ctx.idBase}-panel-${value}`}
      id={`${ctx.idBase}-tab-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => ctx.setValue(value)}
  className={clsx('px-3 h-8 rounded text-xs font-medium transition-colors focus-ring data-[selected=true]:shadow-[var(--elevation-1)]', selected ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]', className)}
      data-selected={selected || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps { value: string; children: ReactNode; className?: string; forceMount?: boolean; }
export function TabsContent({ value, children, className, forceMount=false }: TabsContentProps) {
  const ctx = useContext(TabsContext)!;
  const selected = ctx.value === value;
  if (!selected && !forceMount) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.idBase}-panel-${value}`}
      aria-labelledby={`${ctx.idBase}-tab-${value}`}
      className={clsx('mt-3 outline-none', className)}
    >
      {children}
    </div>
  );
}
