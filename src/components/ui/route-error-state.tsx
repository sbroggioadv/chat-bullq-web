'use client';

import { Button } from '@/components/ui/foundation';

export function RouteErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <main role="alert" style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bq-space-xl, 24px)', color: 'inherit', textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: 'var(--bq-text-dialog-title, 18px)', fontWeight: 600, margin: '0 0 24px' }}>Esta tela não carregou.</h1>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 'var(--bq-space-sm, 8px)' }}>
          <Button onClick={onRetry} style={{ color: 'inherit', background: 'transparent', border: '1px solid currentColor', borderRadius: 'var(--bq-radius-button, 9px)', padding: '8px 12px', cursor: 'pointer' }}>Tentar de novo</Button>
          <Button onClick={() => window.location.reload()} style={{ color: 'inherit', background: 'transparent', border: '1px solid currentColor', borderRadius: 'var(--bq-radius-button, 9px)', padding: '8px 12px', cursor: 'pointer' }}>Recarregar a página</Button>
        </div>
      </div>
    </main>
  );
}
