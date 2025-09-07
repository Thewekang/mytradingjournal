import type { Metadata } from 'next';
import ExportJobsClient from './page.client';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: 'Exports • Trading Journal',
  description: 'Create and manage export jobs for trades and analytics.'
};

// Import client component directly
// const ExportJobsClient = dynamic(() => import('./page.client'));

export default function ExportsPage() {
  return <ExportJobsClient />;
}
