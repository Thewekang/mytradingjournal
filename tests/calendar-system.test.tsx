import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import CalendarClient from '@/app/calendar/page.client';
import { ToastProvider } from '@/components/toast-provider';
import type { Session } from 'next-auth';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock calendar data that matches CalendarData interface
const mockDailyData = [
  { date: '2025-09-01', pnl: 150.75, tradeCount: 3 },
  { date: '2025-09-02', pnl: -45.25, tradeCount: 2 },
  { date: '2025-09-03', pnl: 220.50, tradeCount: 5 },
  { date: '2025-09-04', pnl: 0, tradeCount: 0 },
  { date: '2025-09-05', pnl: 89.25, tradeCount: 2 }
];

const mockTrades = [
  {
    id: '1',
    instrumentId: 'AAPL',
    direction: 'LONG' as const,
    quantity: 100,
    entryPrice: 150.00,
    exitPrice: 152.50,
    status: 'CLOSED',
    entryAt: '2025-09-01T09:30:00Z',
    exitAt: '2025-09-01T10:15:00Z',
    realizedPnl: 250.00,
    tags: [{ id: '1', label: 'breakout', color: '#22c55e' }]
  },
  {
    id: '2',
    instrumentId: 'MSFT',
    direction: 'SHORT' as const,
    quantity: 50,
    entryPrice: 300.00,
    exitPrice: 298.50,
    status: 'CLOSED',
    entryAt: '2025-09-01T14:00:00Z',
    exitAt: '2025-09-01T15:30:00Z',
    realizedPnl: -75.00,
    tags: [{ id: '2', label: 'swing', color: '#3b82f6' }]
  }
];

// Mock calendar data that matches CalendarData interface
const mockCalendarData = {
  dailyData: mockDailyData,
  trades: mockTrades,
  year: 2025,
  month: 7 // August (0-indexed, so 7 = August, 8 = September)
};

// Mock fetch for API calls
global.fetch = vi.fn();

const renderWithProviders = (component: React.ReactElement) => {
  const mockSession: Session = {
    user: { 
      id: '1',
      email: 'test@example.com',
      role: 'USER' as const
    },
    expires: '2025-12-31'
  };

  return render(
    <SessionProvider session={mockSession}>
      <ToastProvider>
        {component}
      </ToastProvider>
    </SessionProvider>
  );
};

describe('Calendar Page System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/analytics/daily')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockDailyData })
        });
      }
      if (url.includes('/api/trades')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockTrades })
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  it('renders the calendar grid correctly', async () => {
    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    // Check that calendar structure is present
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    
    // Check for navigation elements - should show August since month=7
    await waitFor(() => {
      expect(screen.getByText('August 2025')).toBeInTheDocument();
    });
  });

  it('displays daily P/L data with proper color coding', async () => {
    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    await waitFor(() => {
      // Look for positive P/L day
      expect(screen.getByText('+$150.75')).toBeInTheDocument();
      
      // Look for negative P/L day
      expect(screen.getByText('-$45.25')).toBeInTheDocument();
      
      // Look for zero P/L day
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  it('navigates between months correctly', async () => {
    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    await waitFor(() => {
      expect(screen.getByText('September 2025')).toBeInTheDocument();
    });

    // Find and click previous month button
    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText('August 2025')).toBeInTheDocument();
    });

    // Find and click next month button
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('September 2025')).toBeInTheDocument();
    });
  });

  it('opens trade details dialog when clicking on a trading day', async () => {
    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    await waitFor(() => {
      expect(screen.getByText('+$150.75')).toBeInTheDocument();
    });

    // Click on a day with trades
    const tradingDay = screen.getByText('+$150.75');
    fireEvent.click(tradingDay);

    await waitFor(() => {
      expect(screen.getByText('Trades for September 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });
  });

  it('shows proper summary statistics for trading days', async () => {
    renderWithProviders(<CalendarClient />);

    await waitFor(() => {
      expect(screen.getByText('+$150.75')).toBeInTheDocument();
    });

    // Click on a trading day to open details
    const tradingDay = screen.getByText('+$150.75');
    fireEvent.click(tradingDay);

    await waitFor(() => {
      // Check for trade count
      expect(screen.getByText('3 trades')).toBeInTheDocument();
      
      // Check for total P/L
      expect(screen.getByText('$175.00')).toBeInTheDocument(); // Sum of both trades
    });
  });

  it('handles empty trading days correctly', async () => {
    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    // Click on a non-trading day
    const nonTradingDay = screen.getByText('$0.00');
    fireEvent.click(nonTradingDay);

    await waitFor(() => {
      expect(screen.getByText('No trades on this day')).toBeInTheDocument();
    });
  });

  it('displays weekend days with proper styling', async () => {
    renderWithProviders(<CalendarClient />);

    // Weekend days should be visually different
    await waitFor(() => {
      const weekendDays = screen.getAllByText(/sat|sun/i);
      expect(weekendDays.length).toBeGreaterThan(0);
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API failure
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching data', async () => {
    // Mock delayed response
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockDailyData })
        }), 100)
      )
    );

    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('closes trade details dialog when clicking close button', async () => {
    renderWithProviders(<CalendarClient initialData={mockCalendarData} />);

    await waitFor(() => {
      expect(screen.getByText('+$150.75')).toBeInTheDocument();
    });

    // Open dialog
    const tradingDay = screen.getByText('+$150.75');
    fireEvent.click(tradingDay);

    await waitFor(() => {
      expect(screen.getByText('Trades for September 1, 2025')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Trades for September 1, 2025')).not.toBeInTheDocument();
    });
  });
});
