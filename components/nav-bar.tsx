"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signIn, signOut, getSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Activity, BookOpen, Target, CalendarDays, LogIn, LogOut, Sun, Moon } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: Activity },
  { href: '/trades', label: 'Trading Log', icon: BookOpen },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/profile', label: 'Profile', icon: null }
];

export function NavBar() {
  const pathname = usePathname();
  type SessionShape = { user?: { email?: string | null; role?: 'USER' | 'ADMIN' } } | null;
  const [session, setSession] = useState<SessionShape>(null);
  const [theme, setTheme] = useState<'dark'|'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark'|'light') || 'dark';
  });
  useEffect(() => {
    getSession().then(setSession).catch(() => {});
  }, []);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return (
  <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
      <nav className="container flex items-center gap-6 py-3 text-sm" aria-label="Primary">
        <div className="font-semibold tracking-wide flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-accent)]" />
          Trading Journal
        </div>
    <ul className="flex gap-4 flex-1">
      {links.map(l => (
    <li key={l.href}>
  <Link href={l.href} aria-current={pathname === l.href ? 'page' : undefined} className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors focus-ring ${pathname === l.href ? 'bg-[var(--color-bg-muted)] text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]/60'}`}>
                {l.icon && <l.icon className="h-3.5 w-3.5" />}
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 items-center">
          <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors focus-ring">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {session?.user ? (
            <>
              <div className="text-xs text-[var(--color-muted)] hidden sm:block">{session.user.email}</div>
  { session.user?.role === 'ADMIN' && <span className="px-2 py-0.5 rounded bg-amber-600 text-amber-50 text-[10px] font-semibold">ADMIN</span> }
              <Button variant="ghost" size="sm" onClick={() => signOut()} leftIcon={<LogOut className="h-4 w-4" />}>Sign out</Button>
            </>
          ) : (
            <Button variant="solid" size="sm" onClick={() => signIn()} leftIcon={<LogIn className="h-4 w-4" />}>Sign in</Button>
          )}
        </div>
      </nav>
    </header>
  );
}
