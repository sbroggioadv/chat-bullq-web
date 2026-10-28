'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { currencyTotals } from '@/features/pipelines/components/money';
import { KanbanCard } from '@/features/pipelines/components/kanban-card';
import type {
  CardSummary,
  PipelineStage,
} from '@/features/pipelines/services/pipelines.service';

interface Props {
  stage: PipelineStage;
  cards: CardSummary[];
  onAddCard: () => void;
  onCardClick: (card: CardSummary) => void;
}

export function KanbanColumn({ stage, cards, onAddCard, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'stage', stage },
  });

  const totalLabel = cards.length ? currencyTotals(cards) : null;
  const colors: Record<string, string> = { zinc: 'var(--bq-t3)', blue: 'var(--bq-info)', amber: 'var(--bq-warn)', green: 'var(--bq-ok)', red: 'var(--bq-err)', violet: 'var(--bq-agent)', pink: 'var(--bq-ig)' };
  const color = colors[stage.color ?? 'zinc'] ?? colors.zinc;

  const background = stage.type === 'WON' ? 'var(--bq-ok-soft)' : stage.type === 'LOST' ? 'var(--bq-err-soft)' : 'var(--bq-surface)';
  return (
    <div ref={setNodeRef} data-stage={stage.id} style={{ borderColor: `color-mix(in srgb, ${color} 22%, var(--bq-hair))`, backgroundColor: background }} className={`flex h-full min-h-0 min-w-0 flex-col rounded-2xl border ${isOver ? 'ring-2 ring-[var(--bq-accent)]' : ''}`}>
      <div className="flex flex-col gap-0.5 px-[13px] pb-[9px] pt-[11px]">
        <div className="flex min-w-0 items-center gap-[7px] text-[13px] font-semibold">
          {stage.type !== 'NORMAL' && <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${stage.type === 'WON' ? 'bg-[var(--bq-ok)]' : 'bg-[var(--bq-err)]'}`} />}
          <span className="truncate">{stage.name}</span>
          <span style={{ color }} className="font-mono text-[11px] font-medium">{cards.length}</span>
        </div>
        <p aria-label="Total da etapa" className="font-mono text-[11px] text-[var(--bq-t3)]">{totalLabel || 'Sem valor informado'}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-[9px] pb-[9px]">
        {cards.length === 0 && <p className="px-1 pb-2 text-[11px] text-[var(--bq-t3)]">Nenhuma conversa nesta etapa.</p>}
        {cards.map(c => <KanbanCard key={c.id} card={c} onClick={() => onCardClick(c)} />)}
      </div>
      <button type="button" className="mx-[9px] mb-2.5 flex items-center gap-1 rounded px-1 py-1 text-left text-xs text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t1)]" onClick={onAddCard}><Plus size={12} />Adicionar conversa</button>
    </div>
  );
}
