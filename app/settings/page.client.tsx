'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast-provider';
import { User, Shield, TrendingUp, Globe, Trash2, Download, Upload } from 'lucide-react';

export interface SettingsData {
  maxRiskPercentage: number;
  dailyLossLimit: number;
  baseCurrency: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface SettingsClientProps {
  initial: SettingsData | null;
  userEmail?: string;
}

export default function SettingsClient({ initial, userEmail }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState<SettingsData>({
    maxRiskPercentage: initial?.maxRiskPercentage || 2,
    dailyLossLimit: initial?.dailyLossLimit || 500,
    baseCurrency: initial?.baseCurrency || 'USD',
    timezone: initial?.timezone || 'UTC',
    language: initial?.language || 'en',
    emailNotifications: initial?.emailNotifications || true,
    pushNotifications: initial?.pushNotifications || false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const toast = useToast();

  const updateField = (name: keyof SettingsData, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const saveSettings = async () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.errors) {
            setErrors(data.errors);
            return;
          }
          throw new Error(data.message || 'Failed to save settings');
        }

        setMsg('Settings saved successfully!');
        toast.push({ 
          variant: 'success',
          heading: 'Settings saved successfully!',
          duration: 3000
        });
        setTimeout(() => setMsg(null), 3000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save settings';
        toast.push({
          variant: 'danger', 
          heading: message,
          duration: 5000
        });
      }
    });
  };

  const exportData = async () => {
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'JSON', includeAnalytics: true }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.push({
        variant: 'success',
        heading: 'Data exported successfully!',
        duration: 3000
      });
    } catch {
      toast.push({
        variant: 'danger',
        heading: 'Failed to export data',
        duration: 5000
      });
    }
  };

  const InputField = ({ 
    name, 
    label, 
    type = 'text', 
    step, 
    description 
  }: { 
    name: keyof SettingsData; 
    label: string; 
    type?: string; 
    step?: string;
    description?: string;
  }) => {
    const error = errors[name];
    const id = `setting-${name}`;
    
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
        <Input
          id={id}
          type={type}
          step={step}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-red-500 focus:border-red-500' : ''}
          value={String(form[name])}
          onChange={(e) => {
            const value = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            updateField(name, value);
          }}
        />
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  };

  const CheckboxField = ({ 
    name, 
    label, 
    description 
  }: { 
    name: keyof SettingsData; 
    label: string; 
    description?: string;
  }) => (
    <div className="flex items-start space-x-3">
      <input
        type="checkbox"
        id={`setting-${name}`}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
        checked={Boolean(form[name])}
        onChange={(e) => updateField(name, e.target.checked)}
      />
      <div className="flex-1">
        <label htmlFor={`setting-${name}`} className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account preferences, risk parameters, and data settings
        </p>
      </div>

      {msg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
          {msg}
        </div>
      )}

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Data & Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your account details and basic information
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
                  {userEmail?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {userEmail || 'Trading Account'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Active trader since account creation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={userEmail || ''}
                    disabled
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Email address cannot be changed here
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Account Status
                  </label>
                  <div className="mt-1">
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure risk parameters and trading limits
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  name="maxRiskPercentage"
                  label="Maximum Risk Per Trade (%)"
                  type="number"
                  step="0.1"
                  description="Maximum percentage of account to risk on a single trade"
                />
                <InputField
                  name="dailyLossLimit"
                  label="Daily Loss Limit"
                  type="number"
                  step="0.01"
                  description="Maximum daily loss before trading restrictions"
                />
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Risk Management Tips</h4>
                <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                  <li>Never risk more than 1-2% of your account on a single trade</li>
                  <li>Set daily loss limits to prevent emotional trading</li>
                  <li>Review and adjust these settings regularly based on performance</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trading Preferences</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize your trading environment and display settings
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  name="baseCurrency"
                  label="Base Currency"
                  description="Primary currency for calculations and reports"
                />
                <InputField
                  name="timezone"
                  label="Timezone"
                  description="Timezone for trade timestamps and charts"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure how you receive alerts and updates
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <CheckboxField
                name="emailNotifications"
                label="Email Notifications"
                description="Receive trading alerts and performance summaries via email"
              />
              <CheckboxField
                name="pushNotifications"
                label="Push Notifications"
                description="Get real-time notifications in your browser"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Export your data and manage your trading records
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={exportData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export All Data
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Data
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Export Options</h4>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  Export includes all trades, goals, analytics data, and settings in JSON format.
                  This can be used for backup or migration purposes.
                </p>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Danger Zone</h4>
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-red-800 dark:text-red-200">Delete Account</h5>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button variant="destructive" size="sm" className="mt-3">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => {
            setForm({
              maxRiskPercentage: initial?.maxRiskPercentage || 2,
              dailyLossLimit: initial?.dailyLossLimit || 500,
              baseCurrency: initial?.baseCurrency || 'USD',
              timezone: initial?.timezone || 'UTC',
              language: initial?.language || 'en',
              emailNotifications: initial?.emailNotifications || true,
              pushNotifications: initial?.pushNotifications || false,
            });
            setErrors({});
          }}
        >
          Reset
        </Button>
        <Button
          onClick={saveSettings}
          disabled={isPending}
          className="min-w-[100px]"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
