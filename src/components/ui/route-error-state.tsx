'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/foundation';

export function RouteErrorState({ onRetry, fullViewport = false }: { onRetry: () => void; fullViewport?: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <main role="alert" style={{ minHeight: fullViewport ? '100vh' : '100%', boxSizing: fullViewport ? 'border-box' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bq-space-xl, 24px)', color: 'inherit', textAlign: 'center' }}>
      <div>
        <h1 ref={titleRef} tabIndex={-1} style={{ outline: 'none', fontSize: 'var(--bq-text-dialog-title, 18px)', fontWeight: 600, margin: '0 0 24px' }}>Esta tela não carregou.</h1>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 'var(--bq-space-sm, 8px)' }}>
          <Button onClick={onRetry} style={{ color: 'inherit', background: 'transparent', border: '1px solid currentColor', borderRadius: 'var(--bq-radius-button, 9px)', padding: '8px 12px', cursor: 'pointer' }}>Tentar de novo</Button>
          <Button onClick={() => window.location.reload()} style={{ color: 'inherit', background: 'transparent', border: '1px solid currentColor', borderRadius: 'var(--bq-radius-button, 9px)', padding: '8px 12px', cursor: 'pointer' }}>Recarregar a página</Button>
        </div>
      </div>
    </main>
  );
}
