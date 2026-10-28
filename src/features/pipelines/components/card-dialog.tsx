'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type CardSummary,
} from '@/features/pipelines/services/pipelines.service';
import { Button, MacWindow } from '@/components/ui/foundation';

interface Props {
  open: boolean;
  pipelineId: string;
  card: CardSummary | null;
  stageId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const fieldClass = 'w-full rounded-lg border border-[var(--bq-hair-strong)] bg-[var(--bq-surface)] px-3 py-2 text-sm text-[var(--bq-t1)]';

export function CardDialog(props: Props) {
  return props.open ? <CardForm key={props.card?.id ?? 'new'} {...props} /> : null;
}

function CardForm({ pipelineId, card, stageId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(card?.title ?? '');
  const [description, setDescription] = useState(card?.description ?? '');
  const [value, setValue] = useState(card?.value != null ? String(card.value) : '');
  const [closedReason, setClosedReason] = useState(card?.closedReason ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const numericValue = value ? parseFloat(value.replace(',', '.')) : undefined;
      if (card) {
        await pipelinesService.updateCard(card.id, {
          title: title.trim(),
          description: description || null,
          value: numericValue,
          closedReason: closedReason || undefined,
        });
      } else {
        await pipelinesService.createCard(pipelineId, {
          title: title.trim(),
          description: description || undefined,
          value: numericValue,
          stageId: stageId ?? undefined,
        });
      }
      toast.success(card ? 'Card atualizado' : 'Card criado');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!confirm(`Excluir card "${card.title}"?`)) return;
    setSaving(true);
    try {
      await pipelinesService.removeCard(card.id);
      toast.success('Card removido');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MacWindow open onClose={onClose} title={card ? 'Editar card' : 'Novo card'}>
      <div className="space-y-4 pb-5">
        <label className="block space-y-1 text-xs font-medium text-[var(--bq-t2)]">
          <span>Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Lead Bravy School" className={fieldClass} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[var(--bq-t2)]">
          <span>Descrição</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="contexto, próximos passos, info coletada…" className={fieldClass} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[var(--bq-t2)]">
          <span>Valor ({card?.currency || 'BRL'})</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="ex: 4500" inputMode="decimal" className={fieldClass} />
        </label>
        {card && card.status !== 'OPEN' && (
          <label className="block space-y-1 text-xs font-medium text-[var(--bq-t2)]">
            <span>Motivo do fechamento</span>
            <input value={closedReason} onChange={(e) => setClosedReason(e.target.value)} placeholder={card.status === 'WON' ? 'ex: assinou contrato 12 meses' : 'ex: optou por concorrente'} className={fieldClass} />
          </label>
        )}
        {card?.contact && (
          <div className="rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-3 text-xs">
            <p className="text-[var(--bq-t3)]">Contato</p>
            <p className="mt-0.5 font-medium text-[var(--bq-t1)]">{card.contact.name || card.contact.phone}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--bq-hair)] pt-3">
        <div>{card && <Button onClick={handleDelete} disabled={saving} className="!text-[var(--bq-err)] hover:!bg-[var(--bq-err-soft)]"><Trash2 className="h-3.5 w-3.5" />Excluir</Button>}</div>
        <div className="flex gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title} variant="solid">{saving ? 'Salvando…' : card ? 'Salvar' : 'Criar'}</Button>
        </div>
      </div>
    </MacWindow>
  );
}
