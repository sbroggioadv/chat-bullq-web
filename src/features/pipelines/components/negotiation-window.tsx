'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, MacWindow, Pill } from '@/components/ui/foundation';
import { ChatPanel } from '@/features/inbox/components/chat-panel';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { pipelinesService, type CardSummary, type PipelineStage } from '@/features/pipelines/services/pipelines.service';

export function NegotiationWindow({ card, stages, cards, onClose, onEdit }: {
  cards: Record<string, CardSummary[]>; card: CardSummary; stages: PipelineStage[]; onClose: () => void; onEdit: () => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: conversation, isLoading, isError } = useQuery({
    queryKey: ['conversation', card.conversationId],
    queryFn: () => inboxService.getConversation(card.conversationId!),
    enabled: !!card.conversationId,
  });
  const update = () => {
    qc.invalidateQueries({ queryKey: ['conversation', card.conversationId] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['pipeline-board', card.pipelineId] });
  };
  const move = async (stageId: string) => {
    setSaving(true);
    try {
      await pipelinesService.moveCard(card.id, stageId, stageId === card.stageId ? Math.max(0, (cards[stageId]?.length ?? 0) - 1) : (cards[stageId]?.length ?? 0));
      update();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível mudar a etapa');
    } finally { setSaving(false); }
  };
  return <MacWindow open onClose={onClose} title={card.title}>
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
      <Pill tone="info">Conversa · negociação</Pill>
      <Link className="bq-button" href={`/inbox?conversationId=${card.conversationId}`}>Abrir em Conversas</Link>
    </div>
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="flex h-[55dvh] min-h-80 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--bq-hair)]">
        {isLoading ? <p role="status" className="p-4">Carregando conversa…</p> : isError ? <p role="alert" className="p-4">Não foi possível carregar a conversa.</p> : conversation ? <ChatPanel conversation={conversation} onConversationUpdate={update} /> : <p className="p-4">Conversa não disponível.</p>}
      </div>
      <aside aria-label="Negociação" className="space-y-4 rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-3 text-[13px] text-[var(--bq-t2)]">
        <div><h2 className="font-semibold text-[var(--bq-t1)]">Negociação</h2><p className="mt-1">{card.title}</p></div>
        <dl className="space-y-2"><div><dt className="text-xs text-[var(--bq-t3)]">Valor</dt><dd className="font-semibold text-[var(--bq-t1)]">{card.value == null ? 'Ainda não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: card.currency || 'BRL' }).format(Number(card.value))}</dd></div>
          <div><dt className="text-xs text-[var(--bq-t3)]">Responsável</dt><dd>{card.assignedTo?.name || 'Sem responsável'}</dd></div>
          <div><dt className="text-xs text-[var(--bq-t3)]">Situação</dt><dd>{card.status === 'WON' ? 'Ganho' : card.status === 'LOST' ? 'Perdido' : 'Em aberto'}</dd></div>
        </dl>
        <label className="block space-y-1"><span>Etapa</span><select aria-label="Etapa da negociação" disabled={saving} value={card.stageId} onChange={e => void move(e.target.value)} className="w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-2">{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
        {card.description && <p>{card.description}</p>}
        {card.closedReason && <p>Motivo do encerramento: {card.closedReason}</p>}
        <Button onClick={onEdit}>Editar valor e dados</Button>
        <section className="border-t border-[var(--bq-hair)] pt-3"><h3 className="font-medium text-[var(--bq-t1)]">Jornada da negociação</h3><p className="mt-1 text-xs text-[var(--bq-t3)]">Diagnóstico, proposta, contrato e reunião: acompanhamento ainda não disponível.</p></section>
        <section><h3 className="font-medium text-[var(--bq-t1)]">ClickUp do funil</h3><p className="mt-1 text-xs text-[var(--bq-t3)]">Vínculo da negociação ainda não disponível.</p></section>
      </aside>
    </div>
  </MacWindow>;
}
