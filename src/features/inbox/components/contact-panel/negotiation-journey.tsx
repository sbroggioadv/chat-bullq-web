'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { inboxErrorMessage } from '@/features/inbox/components/inbox-error';

export function NegotiationJourney({ conversation }: { conversation: Conversation }) {
  const orgId = useAuthStore(s => s.activeOrgId);
  const userId = useAuthStore(s => s.user?.id);
  const enabled = Boolean(userId && orgId && orgId === conversation.organizationId);
  const cards = useQuery({ queryKey: ['conversation-pipelines', conversation.id, orgId, userId], queryFn: () => pipelinesService.listByConversation(conversation.id), enabled, retry: false });
  const pipelines = useQuery({ queryKey: ['pipelines', orgId, userId], queryFn: () => pipelinesService.list(), enabled, retry: false });
  const error = cards.error || pipelines.error;
  return <section aria-label="Jornada da negociação" className="min-w-0 break-words space-y-3 text-xs text-[var(--bq-t2)]">
    <h3 className="font-semibold text-[var(--bq-t1)]">Jornada da negociação</h3>
    {!enabled && <p role="alert">Conversa fora da organização ativa.</p>}
    {(cards.isLoading || pipelines.isLoading) && <p role="status">Carregando negociações…</p>}
    {error && <p role="alert">{inboxErrorMessage(error, 'Não foi possível carregar a jornada.')} <button className="bq-button" onClick={() => { cards.refetch(); pipelines.refetch(); }}>Tentar novamente</button></p>}
    {!error && cards.data?.length === 0 && <p>Nenhuma negociação vinculada.</p>}
    {!error && cards.data?.map(card => {
      const stages = [...(pipelines.data?.find(p => p.id === card.pipelineId)?.stages ?? [])].sort((a, b) => a.order - b.order);
      const value = card.value == null ? null : Number(card.value);
      return <article key={card.id} className="rounded-lg border border-[var(--bq-hair)] p-3">
        <h4 className="font-medium text-[var(--bq-t1)]">{card.pipeline.name}</h4>
        <p>Valor: {value !== null && Number.isFinite(value) && card.currency && /^[A-Z]{3}$/.test(card.currency) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: card.currency }).format(value) : 'não informado'}</p>
        <ol className="mt-2 space-y-2" aria-label={`Estágios de ${card.pipeline.name}`}>{stages.map(stage => <li className={stage.id === card.stageId ? 'font-semibold text-[var(--bq-ok)]' : 'text-[var(--bq-t3)]'} key={stage.id} aria-current={stage.id === card.stageId ? 'step' : undefined}>{stage.name}{stage.id === card.stageId && <span className="sr-only"> · Estágio atual</span>}</li>)}</ol>
        {!stages.some(s => s.id === card.stageId) && <p>Estágio atual: {card.stage.name}</p>}
      </article>;
    })}
  </section>;
}
