import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import StrategiesClient from '@/app/strategies/page.client';
import { ToastProvider } from '@/components/toast-provider';
import type { Session } from 'next-auth';

// Mock useRouter and useToast
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

// Mock strategies data that matches Strategy interface
const mockStrategies = [
  {
    id: '1',
    name: 'Breakout Strategy',
    description: 'Trading breakouts above resistance levels',
    status: 'OPEN' as const,
    tradeCount: 25,
    totalPnl: 1250.50,
    winRate: 68.0,
    avgPnl: 50.02,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    trades: [
      {
        id: 't1',
        direction: 'LONG',
        entryPrice: 150.00,
        exitPrice: 155.00,
        quantity: 100,
        fees: 2.50,
        entryAt: '2025-01-15T09:30:00Z',
        exitAt: '2025-01-15T11:00:00Z',
        status: 'CLOSED',
        instrument: {
          symbol: 'AAPL',
          contractMultiplier: null
        },
        realizedPnl: 500.00
      }
    ]
  },
  {
    id: '2',
    name: 'Mean Reversion',
    description: 'Trading oversold/overbought conditions',
    status: 'CLOSED' as const,
    tradeCount: 18,
    totalPnl: -325.75,
    winRate: 44.4,
    avgPnl: -18.10,
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-02-28T00:00:00Z',
    trades: [
      {
        id: 't2',
        direction: 'SHORT',
        entryPrice: 200.00,
        exitPrice: 198.00,
        quantity: 50,
        fees: 1.50,
        entryAt: '2025-02-15T14:30:00Z',
        exitAt: '2025-02-15T15:00:00Z',
        status: 'CLOSED',
        instrument: {
          symbol: 'MSFT',
          contractMultiplier: null
        },
        realizedPnl: 100.00
      }
    ]
  }
];

const mockStrategyDetails = {
  id: '1',
  name: 'Breakout Strategy',
  description: 'Trading breakouts above resistance levels',
  createdAt: '2025-01-01T00:00:00Z',
  trades: [
    {
      id: 't1',
      symbol: 'AAPL',
      entryPrice: 150.00,
      exitPrice: 155.00,
      quantity: 100,
      pnl: 500.00,
      entryTime: '2025-01-15T09:30:00Z',
      exitTime: '2025-01-15T11:00:00Z'
    },
    {
      id: 't2',
      symbol: 'MSFT',
      entryPrice: 300.00,
      exitPrice: 295.00,
      quantity: 50,
      pnl: -250.00,
      entryTime: '2025-01-16T14:00:00Z',
      exitTime: '2025-01-16T15:30:00Z'
    }
  ],
  performance: {
    totalPnL: 1250.50,
    winRate: 68.0,
    trades: 25,
    avgHoldTime: 120,
    avgRisk: 1.5,
    profitFactor: 2.1,
    sharpeRatio: 1.3
  }
};

// Mock fetch for API calls
global.fetch = vi.fn();

const renderWithProviders = (component: React.ReactElement) => {
  const mockSession: Session = {
    user: { 
      id: '1',
      email: 'trader@example.com',
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

describe('Strategies Page System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/strategies') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockStrategies })
        });
      }
      if (url.includes('/api/strategies') && options?.method === 'POST') {
        const newStrategy = {
          id: '3',
          name: 'New Strategy',
          description: 'Test strategy',
          createdAt: new Date().toISOString(),
          trades: 0,
          totalPnL: 0,
          winRate: 0,
          avgHoldTime: 0,
          avgRisk: 0
        };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: newStrategy })
        });
      }
      if (url.includes('/api/strategies/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockStrategyDetails })
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  it('renders strategies page with strategy cards', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    // Check page title
    expect(screen.getByText('Trading Strategies')).toBeInTheDocument();
    
    // Wait for strategies to load
    await waitFor(() => {
      expect(screen.getByText('Breakout Strategy')).toBeInTheDocument();
      expect(screen.getByText('Mean Reversion')).toBeInTheDocument();
    });
  });

  it('displays strategy performance metrics correctly', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    await waitFor(() => {
      // Check positive P&L strategy
      expect(screen.getByText('+$1,250.50')).toBeInTheDocument();
      expect(screen.getByText('68.0%')).toBeInTheDocument();
      expect(screen.getByText('25 trades')).toBeInTheDocument();

      // Check negative P&L strategy
      expect(screen.getByText('-$325.75')).toBeInTheDocument();
      expect(screen.getByText('44.4%')).toBeInTheDocument();
      expect(screen.getByText('18 trades')).toBeInTheDocument();
    });
  });

  it('opens create strategy dialog when create button is clicked', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    const createButton = screen.getByText('Create Strategy');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Strategy')).toBeInTheDocument();
    expect(screen.getByLabelText(/Strategy Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
  });

  it('creates a new strategy when form is submitted', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    // Open create dialog
    const createButton = screen.getByText('Create Strategy');
    fireEvent.click(createButton);

    // Fill in form
    const nameInput = screen.getByLabelText(/Strategy Name/);
    const descriptionInput = screen.getByLabelText(/Description/);

    fireEvent.change(nameInput, { target: { value: 'New Strategy' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test strategy description' } });

    // Submit form
    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"name":"New Strategy"')
      });
    });
  });

  it('opens strategy details dialog when strategy card is clicked', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    await waitFor(() => {
      expect(screen.getByText('Breakout Strategy')).toBeInTheDocument();
    });

    // Click on strategy card
    const strategyCard = screen.getByText('Breakout Strategy').closest('div');
    fireEvent.click(strategyCard!);

    await waitFor(() => {
      expect(screen.getByText('Strategy Details')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Recent Trades')).toBeInTheDocument();
    });
  });

  it('displays strategy trades in details dialog', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    await waitFor(() => {
      expect(screen.getByText('Breakout Strategy')).toBeInTheDocument();
    });

    // Click on strategy card to open details
    const strategyCard = screen.getByText('Breakout Strategy').closest('div');
    fireEvent.click(strategyCard!);

    await waitFor(() => {
      // Check for trade details
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('+$500.00')).toBeInTheDocument();
      expect(screen.getByText('-$250.00')).toBeInTheDocument();
    });
  });

  it('shows proper color coding for positive and negative P&L', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    await waitFor(() => {
      const positivePnL = screen.getByText('+$1,250.50');
      const negativePnL = screen.getByText('-$325.75');

      // Positive P&L should have green color class
      expect(positivePnL).toHaveClass('text-green-600');
      
      // Negative P&L should have red color class
      expect(negativePnL).toHaveClass('text-red-600');
    });
  });

  it('filters strategies based on search input', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    await waitFor(() => {
      expect(screen.getByText('Breakout Strategy')).toBeInTheDocument();
      expect(screen.getByText('Mean Reversion')).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search strategies/i);
    fireEvent.change(searchInput, { target: { value: 'Breakout' } });

    // Should filter to only show Breakout Strategy
    expect(screen.getByText('Breakout Strategy')).toBeInTheDocument();
    expect(screen.queryByText('Mean Reversion')).not.toBeInTheDocument();
  });

  it('closes dialogs when close button is clicked', async () => {
    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    // Open create dialog
    const createButton = screen.getByText('Create Strategy');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Strategy')).toBeInTheDocument();

    // Close dialog
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText('Create New Strategy')).not.toBeInTheDocument();
  });

  it('handles API errors gracefully during strategy creation', async () => {
    // Mock API failure
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/strategies') && options?.method === 'POST') {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockStrategies })
      });
    });

    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    // Try to create strategy
    const createButton = screen.getByText('Create Strategy');
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/Strategy Name/);
    fireEvent.change(nameInput, { target: { value: 'Test Strategy' } });

    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to create strategy/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching strategies', async () => {
    // Mock delayed response
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockStrategies })
        }), 100)
      )
    );

    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('displays empty state when no strategies exist', async () => {
    // Mock empty response
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })
    );

    renderWithProviders(<StrategiesClient initialStrategies={mockStrategies} />);

    await waitFor(() => {
      expect(screen.getByText(/no strategies found/i)).toBeInTheDocument();
    });
  });
});
