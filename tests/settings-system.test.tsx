import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import SettingsClient from '@/app/settings/page.client';
import { ToastProvider } from '@/components/toast-provider';
import type { Session } from 'next-auth';

// Mock settings data
const mockSettingsData = {
  maxRiskPercentage: 2,
  dailyLossLimit: 500,
  baseCurrency: 'USD',
  timezone: 'UTC',
  language: 'en',
  emailNotifications: true,
  pushNotifications: false,
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

describe('Settings Page System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/settings') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockSettingsData })
        });
      }
      if (url.includes('/api/settings') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url.includes('/api/exports')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['test data'], { type: 'application/json' }))
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });

    // Mock URL methods for export functionality
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders all four settings tabs correctly', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Check that all tabs are present
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Data & Export')).toBeInTheDocument();
  });

  it('displays user profile information correctly', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Profile tab should be active by default
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('trader@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Click on Risk Management tab
    fireEvent.click(screen.getByText('Risk Management'));
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum Risk Per Trade/)).toBeInTheDocument();

    // Click on Preferences tab
    fireEvent.click(screen.getByText('Preferences'));
    expect(screen.getByText('Trading Preferences')).toBeInTheDocument();
    expect(screen.getByLabelText(/Base Currency/)).toBeInTheDocument();

    // Click on Data & Export tab
    fireEvent.click(screen.getByText('Data & Export'));
    expect(screen.getByText('Data Management')).toBeInTheDocument();
    expect(screen.getByText('Export All Data')).toBeInTheDocument();
  });

  it('loads and displays risk management settings correctly', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Navigate to Risk Management tab
    fireEvent.click(screen.getByText('Risk Management'));

    // Check that risk values are displayed
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Max risk percentage
    expect(screen.getByDisplayValue('500')).toBeInTheDocument(); // Daily loss limit
  });

  it('updates risk management settings when form is changed and saved', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Navigate to Risk Management tab
    fireEvent.click(screen.getByText('Risk Management'));

    // Find and update the max risk percentage field
    const riskInput = screen.getByDisplayValue('2');
    fireEvent.change(riskInput, { target: { value: '1.5' } });

    // Click save button
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"maxRiskPercentage":1.5')
      });
    });
  });

  it('displays and updates notification preferences', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Navigate to Preferences tab
    fireEvent.click(screen.getByText('Preferences'));

    // Find notification checkboxes
    const emailCheckbox = screen.getByLabelText(/Email Notifications/);
    const pushCheckbox = screen.getByLabelText(/Push Notifications/);

    // Check initial states
    expect(emailCheckbox).toBeChecked();
    expect(pushCheckbox).not.toBeChecked();

    // Toggle push notifications
    fireEvent.click(pushCheckbox);

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"pushNotifications":true')
      });
    });
  });

  it('exports data when export button is clicked', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Navigate to Data & Export tab
    fireEvent.click(screen.getByText('Data & Export'));

    // Find and click export button
    const exportButton = screen.getByText('Export All Data');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'JSON', includeAnalytics: true })
      });
    });

    // Check that URL methods were called for download
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('resets form to original values when reset button is clicked', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Navigate to Risk Management tab
    fireEvent.click(screen.getByText('Risk Management'));

    // Change a value
    const riskInput = screen.getByDisplayValue('2');
    fireEvent.change(riskInput, { target: { value: '3' } });

    // Verify the change
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    // Verify the value is reset
    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully during save', async () => {
    // Mock API failure
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/settings') && options?.method === 'POST') {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockSettingsData })
      });
    });

    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Try to save settings
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during save operation', async () => {
    // Mock delayed response
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/settings') && options?.method === 'POST') {
        return new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 100)
        );
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockSettingsData })
      });
    });

    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Click save button
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('displays success message after successful save', async () => {
    renderWithProviders(
      <SettingsClient initial={mockSettingsData} userEmail="trader@example.com" />
    );

    // Click save button
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    });
  });
});
