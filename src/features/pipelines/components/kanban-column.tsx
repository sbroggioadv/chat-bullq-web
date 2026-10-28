'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { FoundationMenu } from '@/components/ui/foundation';
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
    <div ref={setNodeRef} data-stage={stage.id} style={{ borderColor: stage.color ? `color-mix(in srgb, ${color} 10%, var(--bq-hair))` : stage.type === 'NORMAL' ? 'var(--bq-hair)' : 'transparent', backgroundColor: background }} className={`group/column flex h-full min-h-0 min-w-0 flex-col rounded-2xl border ${isOver ? 'ring-2 ring-[var(--bq-accent)]' : ''}`}>
      <div className="flex flex-col gap-0.5 px-bq-space-kpi pb-bq-space-row pt-bq-space-panel">
        <div className="flex min-w-0 items-center gap-bq-space-control text-bq-text-body font-semibold">
          {stage.type !== 'NORMAL' && <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${stage.type === 'WON' ? 'bg-[var(--bq-ok)]' : 'bg-[var(--bq-err)]'}`} />}
          <span className="truncate">{stage.name}</span>
          <span style={{ color }} className="font-[family-name:var(--bq-f-mono)] text-bq-text-metadata font-medium">{cards.length}</span>
          {stage.type !== 'NORMAL' && (
            <div className="relative ml-auto flex shrink-0 items-center [&>button]:!h-4 [&>button]:!min-h-0 [&>button]:!w-4 [&>button]:!border-0 [&>button]:!bg-transparent [&>button]:!p-0 [&>button]:!shadow-none [&>button]:!text-[length:var(--bq-space-none)] md:opacity-0 md:group-hover/column:opacity-100 md:focus-within:opacity-100">
              <FoundationMenu label={`Mais opções da etapa ${stage.name}`} items={[{ label: 'Adicionar conversa', onClick: onAddCard }]} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-base text-[var(--bq-t3)]">⋯</span>
            </div>
          )}
        </div>
        <p aria-label="Total da etapa" className="font-medium font-[family-name:var(--bq-f-mono)] leading-[normal] text-bq-text-metadata text-[var(--bq-t3)]">{totalLabel || 'Sem valor informado'}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-bq-space-row pb-bq-space-row">
        {cards.length === 0 && <p className="px-1 pb-2 text-bq-text-metadata text-[var(--bq-t3)]">Nenhuma conversa nesta etapa.</p>}
        {cards.map(c => <KanbanCard key={c.id} card={c} onClick={() => onCardClick(c)} />)}
      </div>
      {stage.type === 'NORMAL' && <button type="button" className="mx-bq-space-row mb-2.5 flex items-center gap-1 rounded px-1 py-1 text-left text-xs text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t1)]" onClick={onAddCard}><Plus size={12} />Adicionar conversa</button>}
    </div>
  );
}
