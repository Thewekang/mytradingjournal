import './globals.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { Providers } from '../components/providers';
import { NavBar } from '@/components/nav-bar';
import { RiskBreachBanner } from '@/components/risk-breach-banner';

export const metadata: Metadata = {
  title: 'Trading Journal',
  description: 'Multi-instrument trading journal & analytics',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="description" content="Multi-instrument trading journal & analytics" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
  <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-3 py-2 rounded">Skip to content</a>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <RiskBreachBanner />
            <main id="main" className="flex-1 app-container py-6">{children}</main>
            <footer className="text-xs text-[var(--color-muted)] py-6 text-center border-t border-[var(--color-border)]">© {new Date().getFullYear()} Trading Journal</footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
