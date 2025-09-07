import { Suspense } from 'react';
import { DashboardOverview } from '../components/pages/dashboard-overview';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Overview • Trading Journal',
  description: 'High-level trading performance overview.'
};

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardOverview />
    </Suspense>
  );
}
