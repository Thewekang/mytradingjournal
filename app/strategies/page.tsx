import { requireUser } from '../../lib/auth';
import type { Metadata } from 'next';
import StrategiesClient from './page.client';

export const metadata: Metadata = {
  title: 'Strategies • Trading Journal',
  description: 'Manage multi-leg trading strategies and analyze grouped performance.'
};

export default async function StrategiesPage() {
  const user = await requireUser();
  if (!user) {
    return <div className="text-center py-20">Please sign in to manage strategies.</div>;
  }

  // For now, pass empty initial data since we need authentication context in client
  return <StrategiesClient initialStrategies={[]} />;
}
