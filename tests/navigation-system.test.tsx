import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';
import { ToastProvider } from '@/components/toast-provider';
import type { Session } from 'next-auth';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
};

const renderWithProviders = (component: React.ReactElement, pathname = '/dashboard') => {
  const mockSession: Session = {
    user: { 
      id: '1',
      email: 'trader@example.com',
      role: 'USER' as const
    },
    expires: '2025-12-31'
  };

  // Setup navigation mocks
  (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
  (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(pathname);

  return render(
    <SessionProvider session={mockSession}>
      <ToastProvider>
        {component}
      </ToastProvider>
    </SessionProvider>
  );
};

describe('Navigation System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all navigation links correctly', async () => {
    renderWithProviders(<NavBar />);

    // Check that all main navigation links are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Trades')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Strategies')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Exports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights the active navigation item correctly', async () => {
    renderWithProviders(<NavBar />, '/analytics');

    // The Analytics link should be highlighted
    const analyticsLink = screen.getByText('Analytics').closest('a');
    expect(analyticsLink).toHaveClass('bg-[var(--color-bg-alt)]');
  });

  it('navigates to dashboard when dashboard link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const dashboardLink = screen.getByText('Dashboard');
    fireEvent.click(dashboardLink);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to trades when trades link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const tradesLink = screen.getByText('Trades');
    fireEvent.click(tradesLink);

    expect(mockPush).toHaveBeenCalledWith('/trades');
  });

  it('navigates to calendar when calendar link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const calendarLink = screen.getByText('Calendar');
    fireEvent.click(calendarLink);

    expect(mockPush).toHaveBeenCalledWith('/calendar');
  });

  it('navigates to analytics when analytics link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const analyticsLink = screen.getByText('Analytics');
    fireEvent.click(analyticsLink);

    expect(mockPush).toHaveBeenCalledWith('/analytics');
  });

  it('navigates to strategies when strategies link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const strategiesLink = screen.getByText('Strategies');
    fireEvent.click(strategiesLink);

    expect(mockPush).toHaveBeenCalledWith('/strategies');
  });

  it('navigates to goals when goals link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const goalsLink = screen.getByText('Goals');
    fireEvent.click(goalsLink);

    expect(mockPush).toHaveBeenCalledWith('/goals');
  });

  it('navigates to exports when exports link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const exportsLink = screen.getByText('Exports');
    fireEvent.click(exportsLink);

    expect(mockPush).toHaveBeenCalledWith('/exports');
  });

  it('navigates to settings when settings link is clicked', async () => {
    renderWithProviders(<NavBar />);

    const settingsLink = screen.getByText('Settings');
    fireEvent.click(settingsLink);

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('displays proper icons for each navigation item', async () => {
    renderWithProviders(<NavBar />);

    // Check that icons are present (they would be SVG elements)
    const links = screen.getAllByRole('link');
    
    // Each link should contain an SVG icon
    links.forEach(link => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('shows sign-in button when user is not authenticated', async () => {
    const mockSessionUnauthenticated = null;

    render(
      <SessionProvider session={mockSessionUnauthenticated}>
        <ToastProvider>
          <NavBar />
        </ToastProvider>
      </SessionProvider>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('shows user menu when user is authenticated', async () => {
    renderWithProviders(<NavBar />);

    // Should show user email or avatar
    expect(screen.getByText('trader@example.com')).toBeInTheDocument();
  });

  it('handles keyboard navigation correctly', async () => {
    renderWithProviders(<NavBar />);

    const analyticsLink = screen.getByText('Analytics');
    
    // Simulate keyboard navigation
    analyticsLink.focus();
    expect(document.activeElement).toBe(analyticsLink);

    // Simulate Enter key press
    fireEvent.keyDown(analyticsLink, { key: 'Enter', code: 'Enter' });
    
    expect(mockPush).toHaveBeenCalledWith('/analytics');
  });

  it('is responsive and works on mobile viewports', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    renderWithProviders(<NavBar />);

    // Navigation should still be functional on mobile
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows active state for nested routes correctly', async () => {
    renderWithProviders(<NavBar />, '/trades/123');

    // The Trades link should be highlighted for nested trade routes
    const tradesLink = screen.getByText('Trades').closest('a');
    expect(tradesLink).toHaveClass('bg-[var(--color-bg-alt)]');
  });

  it('includes proper accessibility attributes', async () => {
    renderWithProviders(<NavBar />);

    // Check for proper ARIA labels and roles
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Check that links have proper text content for screen readers
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link.textContent).toBeTruthy();
    });
  });

  it('maintains navigation state across page changes', async () => {
    const { rerender } = renderWithProviders(<NavBar />, '/dashboard');

    // Initially on dashboard
    expect(screen.getByText('Dashboard').closest('a')).toHaveClass('bg-[var(--color-bg-alt)]');

    // Navigate to analytics
    (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue('/analytics');
    
    rerender(
      <SessionProvider session={{
        user: { id: '1', email: 'trader@example.com', role: 'USER' as const },
        expires: '2025-12-31'
      }}>
        <ToastProvider>
          <NavBar />
        </ToastProvider>
      </SessionProvider>
    );

    // Analytics should now be highlighted
    expect(screen.getByText('Analytics').closest('a')).toHaveClass('bg-[var(--color-bg-alt)]');
    expect(screen.getByText('Dashboard').closest('a')).not.toHaveClass('bg-[var(--color-bg-alt)]');
  });
});
