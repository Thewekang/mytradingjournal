"use client";
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './toast-provider';
import React from 'react';
import { setLocale, readLocaleCookie } from '@/lib/i18n';

function I18nProvider({ children }: { children: React.ReactNode }) {
  // Simple client locale detection (once) – future: user preference from settings
  React.useEffect(()=>{
    try {
      const fromCookie = readLocaleCookie();
      if (fromCookie) setLocale(fromCookie);
      else { const navLoc = navigator.language || 'en-US'; setLocale(navLoc.startsWith('en')? 'en-US':'en-US'); }
    } catch { /* noop */ }
  },[]);
  // Expose current locale via context when multiple locales added later.
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
