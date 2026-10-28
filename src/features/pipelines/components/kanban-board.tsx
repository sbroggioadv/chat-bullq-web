'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pipelinesService, type CardSummary } from '@/features/pipelines/services/pipelines.service';
import { KanbanColumn } from '@/features/pipelines/components/kanban-column';
import { KanbanCard } from '@/features/pipelines/components/kanban-card';
import { CardDialog } from '@/features/pipelines/components/card-dialog';
import { AddConversationDialog } from '@/features/pipelines/components/add-conversation-dialog';
import { NegotiationWindow } from '@/features/pipelines/components/negotiation-window';

interface Props {
  pipelineId: string;
}

export function KanbanBoard({ pipelineId }: Props) {
  const qc = useQueryClient();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  // Edit dialog (existing card)
  const [editingCard, setEditingCard] = useState<CardSummary | null>(null);
  // Add-conversation dialog (new card from existing conversation)
  const [addStageId, setAddStageId] = useState<string | null>(null);
  // Conversation popup (when card has a linked conversation, click opens chat).
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);

  const { data: board, isLoading, isError, refetch } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Build a fast lookup: cardId → { stageId, index } for the move handler.
  const cardIndex = useMemo(() => {
    const idx = new Map<string, { stageId: string; index: number }>();
    if (board) {
      for (const stageId of Object.keys(board.cards)) {
        board.cards[stageId].forEach((c, i) =>
          idx.set(c.id, { stageId, index: i }),
        );
      }
    }
    return idx;
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const data = event.active.data.current;
    if (data?.type === 'card') setActiveCard(data.card as CardSummary);
    else {
      // fallback: search the board
      for (const stageId of Object.keys(board?.cards ?? {})) {
        const found = board!.cards[stageId].find((c) => c.id === cardId);
        if (found) {
          setActiveCard(found);
          break;
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const cardId = active.id as string;
    const targetStageId = over.id as string;
    const target = board.stages.find((s) => s.id === targetStageId);
    if (!target) return;

    const source = cardIndex.get(cardId);
    if (!source) return;

    // Drop appends to end of target column.
    const toIndex =
      source.stageId === targetStageId
        ? Math.max(0, board.cards[targetStageId].length - 1)
        : board.cards[targetStageId].length;

    if (source.stageId === targetStageId && source.index === toIndex) return;

    // Optimistic: rebuild the board locally.
    qc.setQueryData<typeof board>(['pipeline-board', pipelineId], (prev) => {
      if (!prev) return prev;
      const newCards = { ...prev.cards };
      const sourceList = [...newCards[source.stageId]];
      const [moved] = sourceList.splice(source.index, 1);
      newCards[source.stageId] = sourceList;
      const targetList = [...(newCards[targetStageId] ?? [])];
      targetList.splice(toIndex, 0, { ...moved, stageId: targetStageId });
      newCards[targetStageId] = targetList;
      return { ...prev, cards: newCards };
    });

    try {
      await pipelinesService.moveCard(cardId, targetStageId, toIndex);
      // Server emits card:moved via socket; refetch to sync orders precisely.
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao mover');
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    }
  };

  if (isError) return <div role="alert" className="p-6 text-[var(--bq-t2)]">Não foi possível carregar o pipeline. <button className="bq-button" onClick={() => void refetch()}>Tentar novamente</button></div>;
  if (isLoading || !board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--bq-t3)]">
        Carregando quadro…
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid h-full auto-cols-[minmax(205px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-0.5">
          {board.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={board.cards[stage.id] ?? []}
              onAddCard={() => setAddStageId(stage.id)}
              onCardClick={(c) => {
                // Click primário: abre a conversa em popup. Sem conversa
                // vinculada, cai pra edição do card como fallback.
                if (c.conversationId) setViewingCardId(c.id);
                else setEditingCard(c);
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDialog
        open={!!editingCard}
        pipelineId={pipelineId}
        card={editingCard}
        stageId={null}
        onClose={() => setEditingCard(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setEditingCard(null);
        }}
      />

      <AddConversationDialog
        open={!!addStageId}
        pipelineId={pipelineId}
        stageId={addStageId}
        onClose={() => setAddStageId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setAddStageId(null);
        }}
      />

      {viewingCardId && (() => {
        const card = Object.values(board.cards).flat().find(c => c.id === viewingCardId);
        return card ? <NegotiationWindow cards={board.cards} card={card} stages={board.stages}
          onClose={() => { setViewingCardId(null); qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] }); }}
          onEdit={() => { setViewingCardId(null); setEditingCard(card); }} /> : null;
      })()}

    </>
  );
}
