import { requireUser } from '../../lib/auth';
import type { Metadata } from 'next';
import AnalyticsClient from './page.client';

export const metadata: Metadata = {
  title: 'Analytics • Trading Journal',
  description: 'Advanced analytics and insights for your trading performance.'
};

async function fetchAnalyticsData(userId: string, filters?: { from?: string; to?: string }) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
  
  try {
    const searchParams = new URLSearchParams();
    if (filters?.from) searchParams.set('from', filters.from);
    if (filters?.to) searchParams.set('to', filters.to);
    
    const [summaryRes, equityRes, dailyRes, monthlyRes, distributionRes, drawdownRes, tagPerfRes] = await Promise.all([
      fetch(`${base}/api/analytics/summary?${searchParams}`, { cache: 'no-store' }),
      fetch(`${base}/api/analytics/equity?${searchParams}`, { cache: 'no-store' }),
      fetch(`${base}/api/analytics/daily?${searchParams}`, { cache: 'no-store' }),
      fetch(`${base}/api/analytics/monthly?${searchParams}`, { cache: 'no-store' }),
      fetch(`${base}/api/analytics/distribution?${searchParams}`, { cache: 'no-store' }),
      fetch(`${base}/api/analytics/drawdown?${searchParams}`, { cache: 'no-store' }),
      fetch(`${base}/api/analytics/tag-performance?${searchParams}`, { cache: 'no-store' })
    ]);

    const [summary, equity, daily, monthly, distribution, drawdown, tagPerformance] = await Promise.all([
      summaryRes.ok ? (await summaryRes.json()).data : null,
      equityRes.ok ? (await equityRes.json()).data : [],
      dailyRes.ok ? (await dailyRes.json()).data : [],
      monthlyRes.ok ? (await monthlyRes.json()).data : [],
      distributionRes.ok ? (await distributionRes.json()).data : null,
      drawdownRes.ok ? (await drawdownRes.json()).data : null,
      tagPerfRes.ok ? (await tagPerfRes.json()).data?.tags || [] : []
    ]);

    return {
      summary,
      equity,
      daily,
      monthly,
      distribution,
      drawdown,
      tagPerformance
    };
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    return {
      summary: null,
      equity: [],
      daily: [],
      monthly: [],
      distribution: null,
      drawdown: null,
      tagPerformance: []
    };
  }
}

interface AnalyticsPageProps {
  searchParams?: Promise<{ from?: string; to?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const user = await requireUser();
  if (!user) {
    return <div className="text-center py-20">Please sign in to view analytics.</div>;
  }

  const params = searchParams ? await searchParams : {};
  const filters = {
    from: params.from,
    to: params.to
  };

  const data = await fetchAnalyticsData(user.id!, filters);

  return <AnalyticsClient initialData={data} initialFilters={filters} />;
}
