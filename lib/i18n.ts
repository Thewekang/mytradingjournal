// Minimal i18n groundwork (Milestone 6)
// Provides locale detection (from navigator or user settings later) and formatting helpers.

export type AppLocale = 'en-US'; // extend with additional locales later

export interface I18nConfig { locale: AppLocale }

let current: I18nConfig = { locale: 'en-US' };

export function getI18n(){ return current; }
export function setLocale(locale: AppLocale){ current = { locale }; }

// Number formatting helper
export function fmtNumber(n: number, opts: Intl.NumberFormatOptions = {}){
  return new Intl.NumberFormat(current.locale, opts).format(n);
}

// Date formatting helper (date + time concise)
export function fmtDateTime(d: Date | string | number){
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  return new Intl.DateTimeFormat(current.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
}

// Cookie helpers for client preference persistence (no DB change)
export function readLocaleCookie(): AppLocale | null {
  try {
    const m = document.cookie.match(/(?:^|; )locale=([^;]+)/);
    if (m) {
      const v = decodeURIComponent(m[1]);
      if (v.startsWith('en')) return 'en-US';
    }
  } catch { /* ignore */ }
  return null;
}

export function writeLocaleCookie(locale: AppLocale){
  try { document.cookie = `locale=${encodeURIComponent(locale)}; path=/; max-age=${60*60*24*365}`; } catch { /* ignore */ }
}
