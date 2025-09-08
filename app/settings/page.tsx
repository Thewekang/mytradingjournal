import { requireUser } from '@/lib/auth';
import type { Metadata } from 'next';
import SettingsClient from './page.client';

export const metadata: Metadata = {
  title: 'Settings • Trading Journal',
  description: 'Manage risk parameters, account preferences, and profile settings.'
};

async function getSettings() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
  const res = await fetch(`${base}/api/settings`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) return <div className="p-6 text-center">Please sign in.</div>;
  const settings = await getSettings();
  return <SettingsClient initial={settings} userEmail={user.email} />;
}
