'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  type KeyboardCoordinateGetter,
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

// O quadro move para o fim de uma etapa; o teclado percorre essas mesmas etapas.
const stageCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(event.code)) return;
  event.preventDefault();
  const { collisionRect, droppableContainers, droppableRects } = context;
  if (!collisionRect) return;
  const stages = droppableContainers.getEnabled()
    .filter(item => item.data.current?.type === 'stage')
    .map(item => ({ id: item.id, rect: droppableRects.get(item.id) }))
    .filter(item => item.rect !== undefined)
    .sort((a, b) => a.rect!.left - b.rect!.left);
  const current = stages.findIndex(item => item.id === (context.over?.id ?? context.active?.data.current?.card.stageId));
  const target = stages[current + (event.code === 'ArrowRight' ? 1 : -1)];
  if (!target?.rect) return;
  return {
    x: currentCoordinates.x + target.rect.left + target.rect.width / 2 - (collisionRect.left + collisionRect.width / 2),
    y: currentCoordinates.y,
  };
};

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
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter', 'Tab'] },
      coordinateGetter: stageCoordinates,
    }),
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
        onDragCancel={() => setActiveCard(null)}
        accessibility={{
          screenReaderInstructions: { draggable: 'Enter abre a negociação. Espaço inicia o arraste; use as setas esquerda e direita para escolher a etapa. Espaço ou Enter solta; Escape cancela.' },
          announcements: {
            onDragStart: ({ active }) => `Arrastando ${active.data.current?.card.title}.`,
            onDragOver: ({ over }) => over ? `Etapa ${over.data.current?.stage.name}.` : 'Fora de uma etapa.',
            onDragEnd: ({ over }) => over ? `Solto em ${over.data.current?.stage.name}.` : 'Movimento cancelado.',
            onDragCancel: () => 'Movimento cancelado.',
          },
        }}
      >
        <div data-pipeline-board className="grid h-full auto-cols-[minmax(var(--bq-size-pipeline-column),1fr)] grid-flow-col gap-3 overflow-x-auto pb-0.5">
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
          {activeCard ? <KanbanCard card={activeCard} overlay /> : null}
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
