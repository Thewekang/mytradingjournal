import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import AnalyticsClient from '@/app/analytics/page.client';
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

// Mock the analytics data structure that matches AnalyticsData interface
const mockInitialData = {
  summary: {
    totalTrades: 150,
    winRate: 65.5,
    expectancy: 89.50,
    profitFactor: 1.95,
    avgWin: 185.50,
    avgLoss: -95.25,
    maxConsecutiveLosses: 3,
    currentConsecutiveLosses: 0,
    avgHoldMinutes: 120,
    dailyVariance: 0.25
  },
  equity: [
    { date: '2025-01-01', equity: 10000 },
    { date: '2025-01-02', equity: 10150 },
    { date: '2025-01-03', equity: 10075 }
  ],
  daily: [
    { date: '2025-01-01', pnl: 150.50, tradeCount: 3 },
    { date: '2025-01-02', pnl: -75.25, tradeCount: 2 },
    { date: '2025-01-03', pnl: 220.75, tradeCount: 4 }
  ],
  monthly: [
    { month: '2025-01', pnl: 1250.50, trades: 25, winRate: 68.0 },
    { month: '2025-02', pnl: 890.25, trades: 18, winRate: 61.1 }
  ],
  distribution: {
    wins: 98,
    losses: 52,
    breakeven: 0,
    winRate: 65.3
  },
  drawdown: {
    maxDrawdown: -850.00,
    currentDrawdown: -125.50,
    maxDrawdownStart: '2025-01-15',
    maxDrawdownEnd: '2025-01-20'
  },
  tagPerformance: [
    {
      tagId: '1',
      label: 'breakout',
      color: '#22c55e',
      trades: 35,
      wins: 24,
      losses: 11,
      winRate: 68.6,
      sumPnl: 1250.75,
      avgPnl: 35.73
    },
    {
      tagId: '2',
      label: 'swing',
      color: '#3b82f6',
      trades: 28,
      wins: 18,
      losses: 10,
      winRate: 64.3,
      sumPnl: 890.50,
      avgPnl: 31.80
    }
  ]
};

const mockInitialFilters = {
  from: '2025-01-01',
  to: '2025-12-31'
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

describe('Analytics Page System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/analytics/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInitialData.summary })
        });
      }
      if (url.includes('/api/analytics/equity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInitialData.equity })
        });
      }
      if (url.includes('/api/analytics/monthly')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInitialData.monthly })
        });
      }
      if (url.includes('/api/analytics/distribution')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInitialData.distribution })
        });
      }
      if (url.includes('/api/analytics/tag-performance')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInitialData.tagPerformance })
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  it('renders all four analytics tabs correctly', async () => {
    renderWithProviders(
      <AnalyticsClient 
        initialData={mockInitialData} 
        initialFilters={mockInitialFilters} 
      />
    );

    // Check that all tabs are present
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Patterns')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('loads and displays performance metrics correctly', async () => {
    renderWithProviders(
      <AnalyticsClient 
        initialData={mockInitialData} 
        initialFilters={mockInitialFilters} 
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total trades
      expect(screen.getByText('65.5%')).toBeInTheDocument(); // Win rate
      expect(screen.getByText('$12,500.75')).toBeInTheDocument(); // Total P&L
    });
  });

  it('switches between tabs and loads appropriate content', async () => {
    renderWithProviders(
      <AnalyticsClient 
        initialData={mockInitialData} 
        initialFilters={mockInitialFilters} 
      />
    );

    // Click on Patterns tab
    fireEvent.click(screen.getByText('Patterns'));
    
    await waitFor(() => {
      expect(screen.getByText('Trading Patterns')).toBeInTheDocument();
    });

    // Click on Risk tab
    fireEvent.click(screen.getByText('Risk'));
    
    await waitFor(() => {
      expect(screen.getByText('Risk Metrics')).toBeInTheDocument();
    });

    // Click on Tags tab
    fireEvent.click(screen.getByText('Tags'));
    
    await waitFor(() => {
      expect(screen.getByText('Tag Performance')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API failure
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    renderWithProviders(
      <AnalyticsClient 
        initialData={mockInitialData} 
        initialFilters={mockInitialFilters} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });

  it('exports data when export button is clicked', async () => {
    // Mock successful export
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/exports')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['test data'], { type: 'application/json' }))
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    renderWithProviders(
      <AnalyticsClient 
        initialData={mockInitialData} 
        initialFilters={mockInitialFilters} 
      />
    );

    // Find and click export button
    const exportButton = screen.getByText(/export/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/exports', expect.any(Object));
    });
  });

  it('displays loading states appropriately', async () => {
    // Mock delayed response
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInitialData.summary })
        }), 100)
      )
    );

    renderWithProviders(
      <AnalyticsClient 
        initialData={mockInitialData} 
        initialFilters={mockInitialFilters} 
      />
    );

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 200 });
  });
});
