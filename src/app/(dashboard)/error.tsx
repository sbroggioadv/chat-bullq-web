'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RouteErrorState } from '@/components/ui/route-error-state';

export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    console.error('Erro de renderização da tela', { digest: error.digest });
  }, [error]);

  return <RouteErrorState onRetry={() => { queryClient.removeQueries({ type: 'inactive' }); retry(); }} />;
}
