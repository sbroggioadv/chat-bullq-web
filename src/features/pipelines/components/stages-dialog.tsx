'use client';

import { Button, MacWindow } from '@/components/ui/foundation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  GripVertical,
  Trophy,
  XCircle,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type StageType,
  type PipelineStage,
} from '@/features/pipelines/services/pipelines.service';

interface DraftStage {
  // Frontend-only id for dnd; if existing, also has serverId
  key: string;
  serverId?: string;
  name: string;
  color: string;
  type: StageType;
}

interface Props {
  open: boolean;
  pipelineId: string;
  initialStages: PipelineStage[];
  onClose: () => void;
  onSaved: () => void;
  onManagePipelines?: () => void;
}

const COLORS: Array<{ name: string; cls: string }> = [
  { name: 'zinc', cls: 'bg-[var(--bq-t3-fill)]' },
  { name: 'blue', cls: 'bg-[var(--bq-info)]' },
  { name: 'amber', cls: 'bg-[var(--bq-warn)]' },
  { name: 'green', cls: 'bg-[var(--bq-ok)]' },
  { name: 'red', cls: 'bg-[var(--bq-err)]' },
  { name: 'violet', cls: 'bg-[var(--bq-agent)]' },
  { name: 'pink', cls: 'bg-[var(--bq-ig)]' },
];

const TYPE_OPTIONS: Array<{
  value: StageType;
  label: string;
  Icon: React.ElementType;
  cls: string;
}> = [
  { value: 'NORMAL', label: 'Normal', Icon: Circle, cls: 'text-[var(--bq-t3)]' },
  { value: 'WON', label: 'Ganho', Icon: Trophy, cls: 'text-[var(--bq-ok)]' },
  { value: 'LOST', label: 'Perdido', Icon: XCircle, cls: 'text-[var(--bq-err)]' },
];

function makeKey() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function SortableRow({
  stage,
  onChange,
  onDelete,
}: {
  stage: DraftStage;
  onChange: (patch: Partial<DraftStage>) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] p-3  "
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-[var(--bq-t3)] hover:text-[var(--bq-t3)] active:cursor-grabbing"
        aria-label="Arrastar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 space-y-2">
        <input
          value={stage.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nome da stage"
          className="w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2.5 py-1.5 text-sm   "
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Colors */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => onChange({ color: c.name })}
                className={`size-5 rounded-full ${c.cls} ${
                  stage.color === c.name
                    ? 'ring-2 ring-[var(--bq-t1)] ring-offset-1 '
                    : ''
                }`}
                aria-label={c.name}
              />
            ))}
          </div>

          <div className="ml-1 h-4 w-px bg-[var(--bq-raised-2)] " />

          {/* Type */}
          <div className="flex items-center gap-1">
            {TYPE_OPTIONS.map((t) => {
              const active = stage.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange({ type: t.value })}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    active
                      ? 'bg-[var(--bq-solid-bg)] text-[var(--bq-solid-fg)]  '
                      : 'bg-[var(--bq-raised-2)] text-[var(--bq-t3)] hover:bg-[var(--bq-raised-2)]  '
                  }`}
                  title={t.label}
                >
                  <t.Icon className={`h-3 w-3 ${!active ? t.cls : ''}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1.5 text-[var(--bq-t3)] hover:bg-[var(--bq-err-soft)] hover:text-[var(--bq-err)] "
        title="Excluir"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StagesDialog({
  open,
  pipelineId,
  initialStages,
  onClose,
  onSaved,
  onManagePipelines,
}: Props) {
  const qc = useQueryClient();
  const [stages, setStages] = useState<DraftStage[]>(() => initialStages.map(s => ({ key: s.id, serverId: s.id, name: s.name, color: s.color ?? 'zinc', type: s.type })));
  const [saving, setSaving] = useState(false);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (!open) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIdx = prev.findIndex((s) => s.key === active.id);
      const newIdx = prev.findIndex((s) => s.key === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleAdd = () => {
    setStages((prev) => [
      ...prev,
      { key: makeKey(), name: '', color: 'zinc', type: 'NORMAL' },
    ]);
  };

  const handleSave = async () => {
    if (stages.some((s) => !s.name.trim())) {
      toast.error('Toda stage precisa de um nome');
      return;
    }
    setSaving(true);
    try {
      await pipelinesService.upsertStages(
        pipelineId,
        stages.map((s, idx) => ({
          ...(s.serverId ? { id: s.serverId } : {}),
          name: s.name.trim(),
          color: s.color,
          type: s.type,
          order: idx,
        })),
      );
      toast.success('Stages atualizadas');
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      onSaved();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao salvar stages',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MacWindow open={open} onClose={onClose} title="Configurar etapas">
      <div className="flex max-h-[70dvh] min-h-0 flex-col text-[var(--bq-t1)]">
        {onManagePipelines && <Button className="mx-6 mb-3 self-start" onClick={onManagePipelines}>Todos / Gerenciar pipelines</Button>}
        <p className="px-6 text-xs text-[var(--bq-t3)]">Adicione, renomeie, reordene ou troque o tipo. Etapa com cards não pode ser excluída.</p>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {stages.map((s, idx) => (
                  <SortableRow
                    key={s.key}
                    stage={s}
                    onChange={(patch) =>
                      setStages((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
                      )
                    }
                    onDelete={() =>
                      setStages((prev) => prev.filter((_, i) => i !== idx))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--bq-hair-strong)] px-3 py-2 text-sm text-[var(--bq-t3)] hover:border-[var(--bq-accent)] hover:text-[var(--bq-accent-text)] "
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar stage
          </button>

          <p className="mt-4 text-[11px] text-[var(--bq-t3)]">
            Tipos: <strong>Normal</strong> = stage intermediária ·{' '}
            <strong>Ganho</strong> = ao arrastar pra cá, marca card como WON +
            closedAt = now · <strong>Perdido</strong> = idem com LOST.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--bq-hair-strong)] bg-[var(--bq-raised-2)] px-6 py-3  ">
          <Button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--bq-t3)] hover:bg-[var(--bq-raised-2)]  "
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || stages.length === 0}
            className="rounded-md bg-[var(--bq-accent)] px-4 py-1.5 text-sm font-medium text-[var(--bq-on-accent)] hover:bg-[var(--bq-accent-soft)] disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar stages'}
          </Button>
        </div>
      </div>
    </MacWindow>
  );
}
