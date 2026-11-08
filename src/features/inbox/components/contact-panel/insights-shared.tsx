'use client';
import { useAuthStore } from '@/stores/auth-store';

/** Permissions are part of the key so a revoked channel cannot reuse a prior result. */
export function useInsightsScope() {
  const userId = useAuthStore(s => s.user?.id);
  const orgId = useAuthStore(s => s.activeOrgId);
  const channels = useAuthStore(s => s.organizations.find(o => o.id === s.activeOrgId)?.accessibleChannelIds);
  return [userId, orgId, channels] as const;
}
export function InsightsError({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div role="alert" className="text-[var(--bq-err)] break-words">
    <p>{error instanceof Error ? error.message : 'Não foi possível carregar os dados.'}</p>
    {retry && <button type="button" className="mt-2 underline" onClick={retry}>Tentar novamente</button>}
  </div>;
}
export const insightBody = 'min-w-0 space-y-3 px-4 pb-4 text-xs text-[var(--bq-t2)]';
export const insightButton = 'rounded-bq-radius-button border border-[var(--bq-hair)] bg-[var(--bq-raised)] px-3 py-2 text-[var(--bq-t1)] hover:bg-[var(--bq-raised-2)] disabled:opacity-50';
export function insightDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
