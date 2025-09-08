import { ShadcnDashboardDemo } from '@/components/shadcn-dashboard-demo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'shadcn/ui Demo • Trading Journal',
  description: 'Showcase of shadcn/ui components integration in the trading journal.'
}

export default function ShadcnDemoPage() {
  return <ShadcnDashboardDemo />
}
