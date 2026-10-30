'use client';

import { useEffect, useState } from 'react';
import { RouteErrorState } from '@/components/ui/route-error-state';
import './globals.css';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    try {
      if (localStorage.getItem('bullq2-theme-mode') === 'dark') void Promise.resolve().then(() => setMode('dark'));
    } catch { /* Armazenamento indisponível: mantém o tema claro. */ }
    console.error('Erro de renderização global', { digest: error.digest });
  }, [error]);

  return (
    <html lang="pt-BR" data-brand="A" data-mode={mode}>
      <head><title>Chat BullQ — erro</title></head>
      <body style={{ margin: 0, minHeight: '100vh', backgroundColor: mode === 'dark' ? '#141519' : '#ffffff', color: mode === 'dark' ? '#f1f2f4' : '#12141a', fontFamily: 'system-ui, sans-serif' }}>
        <RouteErrorState onRetry={retry} fullViewport />
      </body>
    </html>
  );
}
