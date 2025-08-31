"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Alert, AlertProps } from './ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastOptions {
  id?: string;
  variant?: AlertProps['variant'];
  heading?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number; // ms
  dismissible?: boolean;
}

interface ToastRecord extends ToastOptions { id: string; createdAt: number; }

interface ToastContextValue {
  push(toast: ToastOptions): string;
  dismiss(id: string): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const push = useCallback((opts: ToastOptions) => {
    const id = opts.id || Math.random().toString(36).slice(2);
    setToasts(curr => [...curr, { id, variant: 'info', duration: 5000, dismissible: true, ...opts, createdAt: Date.now() }]);
    return id;
  }, []);
  const dismiss = useCallback((id: string) => {
    setToasts(curr => curr.filter(t => t.id !== id));
  }, []);

  // auto-dismiss effect
  React.useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(t => {
      if (!t.duration) return null as any;
      const remaining = t.createdAt + t.duration - Date.now();
      if (remaining <= 0) { dismiss(t.id); return null; }
      return setTimeout(() => dismiss(t.id), remaining);
    });
    return () => { timers.forEach(t => t && clearTimeout(t)); };
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-4 right-4 z-[60] w-[320px] space-y-2" role="region" aria-label="Notifications">
          {toasts.map(t => {
            const icon = t.variant === 'success' ? <CheckCircle2 className="h-4 w-4" /> : t.variant === 'warning' ? <AlertTriangle className="h-4 w-4" /> : t.variant === 'danger' ? <XCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />;
            return (
              <div key={t.id} role={t.variant === 'danger' ? 'alert' : 'status'} aria-live={t.variant === 'danger' ? 'assertive' : 'polite'}>
                <Alert variant={t.variant || 'info'} heading={<span className="inline-flex items-center gap-2">{icon}{t.heading}</span>} dismissible={t.dismissible} onDismiss={() => dismiss(t.id)} size="sm" className="shadow-lg backdrop-blur bg-opacity-90">
                  {t.description}
                </Alert>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}