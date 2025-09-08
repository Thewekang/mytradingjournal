import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsClient from '@/app/settings/page.client';
import { useToast } from '@/components/toast-provider';

// Mock the toast provider
vi.mock('@/components/toast-provider', () => ({
  useToast: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn();

const mockToast = {
  push: vi.fn(),
  dismiss: vi.fn()
};

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue(mockToast);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  const defaultSettings = {
    maxRiskPercentage: 2,
    dailyLossLimit: 500,
    baseCurrency: 'USD',
    timezone: 'UTC',
    language: 'en',
    emailNotifications: true,
    pushNotifications: false
  };

  it('renders settings page with all tabs', () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Data & Export')).toBeInTheDocument();
  });

  it('displays user profile information', () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('allows editing risk management settings', async () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    // Switch to Risk Management tab
    fireEvent.click(screen.getByText('Risk Management'));

    const riskInput = screen.getByLabelText(/Maximum Risk Per Trade/);
    const lossLimitInput = screen.getByLabelText(/Daily Loss Limit/);

    expect(riskInput).toHaveValue('2');
    expect(lossLimitInput).toHaveValue('500');

    // Update values
    fireEvent.change(riskInput, { target: { value: '1.5' } });
    fireEvent.change(lossLimitInput, { target: { value: '300' } });

    expect(riskInput).toHaveValue('1.5');
    expect(lossLimitInput).toHaveValue('300');
  });

  it('manages notification preferences', async () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    // Switch to Preferences tab
    fireEvent.click(screen.getByText('Preferences'));

    const emailCheckbox = screen.getByLabelText(/Email Notifications/);
    const pushCheckbox = screen.getByLabelText(/Push Notifications/);

    expect(emailCheckbox).toBeChecked();
    expect(pushCheckbox).not.toBeChecked();

    // Toggle notifications
    fireEvent.click(pushCheckbox);
    expect(pushCheckbox).toBeChecked();
  });

  it('saves settings successfully', async () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    // Switch to Risk Management tab and make changes
    fireEvent.click(screen.getByText('Risk Management'));
    
    const riskInput = screen.getByLabelText(/Maximum Risk Per Trade/);
    fireEvent.change(riskInput, { target: { value: '1.5' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...defaultSettings,
          maxRiskPercentage: 1.5
        })
      });
    });

    expect(mockToast.push).toHaveBeenCalledWith({
      variant: 'success',
      heading: 'Settings saved successfully!',
      duration: 3000
    });
  });

  it('handles save errors gracefully', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ 
        message: 'Validation failed',
        errors: { maxRiskPercentage: 'Must be between 0 and 10' }
      })
    });

    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Must be between 0 and 10')).toBeInTheDocument();
    });
  });

  it('exports data successfully', async () => {
    // Mock the blob and URL.createObjectURL
    const mockBlob = new Blob(['test data'], { type: 'application/json' });
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    });

    // Mock createElement and click for download
    const mockElement = {
      href: '',
      download: '',
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockElement as unknown as HTMLAnchorElement);

    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    // Switch to Data & Export tab
    fireEvent.click(screen.getByText('Data & Export'));

    const exportButton = screen.getByText('Export All Data');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'JSON', includeAnalytics: true })
      });
    });

    expect(mockElement.click).toHaveBeenCalled();
    expect(mockToast.push).toHaveBeenCalledWith({
      variant: 'success',
      heading: 'Data exported successfully!',
      duration: 3000
    });
  });

  it('resets form to initial values', () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    // Switch to Risk Management and change values
    fireEvent.click(screen.getByText('Risk Management'));
    
    const riskInput = screen.getByLabelText(/Maximum Risk Per Trade/);
    fireEvent.change(riskInput, { target: { value: '5' } });
    
    expect(riskInput).toHaveValue('5');

    // Reset form
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(riskInput).toHaveValue('2');
  });

  it('displays risk management tips', () => {
    render(<SettingsClient initial={defaultSettings} userEmail="test@example.com" />);

    fireEvent.click(screen.getByText('Risk Management'));

    expect(screen.getByText('Risk Management Tips')).toBeInTheDocument();
    expect(screen.getByText(/Never risk more than 1-2% of your account/)).toBeInTheDocument();
  });

  it('handles missing initial settings gracefully', () => {
    render(<SettingsClient initial={null} userEmail="test@example.com" />);

    fireEvent.click(screen.getByText('Risk Management'));

    const riskInput = screen.getByLabelText(/Maximum Risk Per Trade/);
    const lossLimitInput = screen.getByLabelText(/Daily Loss Limit/);

    // Should use default values when initial is null
    expect(riskInput).toHaveValue('2');
    expect(lossLimitInput).toHaveValue('500');
  });
});
