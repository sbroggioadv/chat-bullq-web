'use client';

import { Suspense } from 'react';
import { ChannelsList } from '@/features/channels/components/channels-list';

export default function SettingsChannelsPage() {
  return (
    <Suspense>
      <ChannelsList />
    </Suspense>
  );
}
