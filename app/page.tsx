import { Suspense } from 'react';
import { DashboardOverview } from '../components/pages/dashboard-overview';

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardOverview />
    </Suspense>
  );
}
