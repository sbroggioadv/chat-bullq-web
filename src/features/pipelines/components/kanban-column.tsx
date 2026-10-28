'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus, Trophy, X as XIcon } from 'lucide-react';
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

  return (
    <div style={{ borderColor: color }} className="flex h-full w-[260px] shrink-0 flex-col rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-surface)]">
      <div
        className="flex items-center justify-between gap-2 border-b border-[var(--bq-hair)] px-3 py-3"
      >
        <div className="flex min-w-0 items-center gap-2">
          {stage.type === 'WON' && (
            <Trophy className="h-3.5 w-3.5 shrink-0 text-[var(--bq-ok)]" />
          )}
          {stage.type === 'LOST' && (
            <XIcon className="h-3.5 w-3.5 shrink-0 text-[var(--bq-err)]" />
          )}
          <span className="truncate text-[12px] font-semibold text-[var(--bq-t1)]">
            {stage.name}
          </span>
          <span
            style={{ color, backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)` }}
            className="rounded-md bg-[var(--bq-raised-2)] px-1.5 py-0.5 text-[10px] text-[var(--bq-t3)]"
          >
            {cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddCard}
          className="bq-icon"
          aria-label="Adicionar conversa"
          title="Adicionar conversa nesta etapa"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto rounded-b-lg p-2 transition-colors ${
          isOver
            ? 'bg-[var(--bq-accent-soft)] ring-2 ring-[var(--bq-hair-strong)]'
            : 'bg-transparent'
        }`}
      >
        {cards.length === 0 && (
          <p className="py-6 text-center text-[11px] text-[var(--bq-t3)]">
            Nenhuma conversa nesta etapa.
          </p>
        )}
        {cards.map((c) => (
          <KanbanCard key={c.id} card={c} onClick={() => onCardClick(c)} />
        ))}
        <button className="bq-button w-full justify-center border-dashed" onClick={onAddCard}><Plus size={13} /> Adicionar conversa</button>
        {totalLabel && (
          <p className="pt-2 text-center text-[10px] uppercase tracking-wide text-[var(--bq-t3)]">
            Total: {totalLabel}
          </p>
        )}
      </div>
    </div>
  );
}
