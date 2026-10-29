'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PageSkeleton } from '@/components/ui/foundation';
import { AgentsPageHeader } from '@/features/ai-agents/components/agents-page-header';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

function AgentsLoadingHeader() {
  const searchParams = useSearchParams();
  return searchParams.get('agentId') ? null : <AgentsPageHeader />;
}

export function RouteLoading() {
  const pathname = usePathname();

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return (
      <>
        <SettingsPageHeader pathname={pathname} />
        <PageSkeleton />
      </>
    );
  }

  if (pathname === '/ai-agents') {
    return (
      <>
        {/* Query resolution may suspend; keep the loading feedback outside it. */}
        <Suspense fallback={null}>
          <AgentsLoadingHeader />
        </Suspense>
        <PageSkeleton />
      </>
    );
  }

  return <PageSkeleton />;
}
