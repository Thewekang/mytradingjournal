"use client";
import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

export interface DialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title?: string;
  children: React.ReactNode;
  description?: string;
  widthClass?: string; // tailwind width utilities
  initialFocusRef?: React.RefObject<HTMLElement>;
}

// Minimal focus trap + scroll lock dialog
export function Dialog({ open, onOpenChange, title, description, children, widthClass='max-w-md', initialFocusRef }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useRef(`dialog-${Math.random().toString(36).slice(2)}-title`);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Focus trap & initial focus
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('data-focus-guard'));
    const firstFocusTarget = initialFocusRef?.current || focusables()[0];
    firstFocusTarget?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onOpenChange(false); }
      if (e.key === 'Tab') {
        const els = focusables();
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, initialFocusRef]);

  // return focus to opener element
  useEffect(() => {
    if (!open && openerRef.current) {
      openerRef.current.focus();
    }
  }, [open]);

  if (!open) return null;
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden />
  <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId.current : undefined} className={clsx('relative bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg shadow-lg mt-16 w-full', widthClass, 'focus-ring')}>
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h2 id={titleId.current} className="text-sm font-semibold">{title}</h2>
            <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] focus-ring rounded px-1 py-0.5">✕</button>
          </div>
        )}
        {description && <p className="px-4 pt-3 text-xs text-[var(--color-muted)]">{description}</p>}
        <div className="p-4 pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
