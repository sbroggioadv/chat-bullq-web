'use client';

import { Button, MacWindow } from '@/components/ui/foundation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  inboxService,
  type Conversation,
} from '@/features/inbox/services/inbox.service';

interface Props {
  open: boolean;
  pipelineId: string;
  stageId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Adds an existing conversation to a kanban pipeline. The card is just a
 * pointer to the conversation — title/contact are auto-derived on the
 * backend so the operator only has to pick which conversation enters the
 * pipeline (and optionally set a value).
 */
export function AddConversationDialog({
  open,
  pipelineId,
  stageId,
  onClose,
  onSaved,
}: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [value, setValue] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebounced('');
      setValue('');
      setPickedId(null);
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', 'pipeline-picker', debounced],
    queryFn: () =>
      inboxService.getConversations({
        limit: '20',
        page: '1',
        ...(debounced ? { search: debounced } : {}),
      }),
    enabled: open,
  });

  const conversations = useMemo(
    () => data?.conversations ?? [],
    [data],
  );

  if (!open) return null;

  const handleAdd = async () => {
    if (!pickedId) {
      toast.error('Selecione uma conversa');
      return;
    }
    setSaving(true);
    try {
      const numericValue = value ? parseFloat(value.replace(',', '.')) : undefined;
      await pipelinesService.createCard(pipelineId, {
        conversationId: pickedId,
        stageId: stageId ?? undefined,
        value: numericValue,
      });
      toast.success('Conversa adicionada ao pipeline');
      onSaved();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message :
          'Erro ao adicionar conversa no pipeline',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MacWindow open={open} onClose={onClose} title="Adicionar conversa ao pipeline">
      <div className="flex max-h-[70dvh] min-h-0 flex-col text-[var(--bq-t1)]">
        <p className="px-6 text-xs text-[var(--bq-t3)]">Escolha uma conversa existente. O card será criado vinculado a ela.</p>
        <div className="border-b border-[var(--bq-hair-strong)] px-6 py-3 ">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bq-t3)]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone…"
              className="w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] py-2 pl-9 pr-3 text-sm   "
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-sm text-[var(--bq-t3)]">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!isLoading && conversations.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--bq-t3)]">
              Nenhuma conversa encontrada
            </p>
          )}
          {conversations.map((c: Conversation) => {
            const picked = pickedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setPickedId(c.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                  picked
                    ? 'bg-[var(--bq-accent-soft)] '
                    : 'hover:bg-[var(--bq-raised-2)] '
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bq-raised-2)] text-xs font-semibold text-[var(--bq-t3)] ">
                  {(c.contact.name || c.contact.phone || '??')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--bq-t1)] ">
                    {c.contact.name || c.contact.phone || 'Desconhecido'}
                  </p>
                  <p className="truncate text-[11px] text-[var(--bq-t3)]">
                    <span className="uppercase">{c.channel.type}</span>
                    {c.contact.phone && c.contact.name
                      ? ` · ${c.contact.phone}`
                      : ''}
                  </p>
                </div>
                {c.isGroup && (
                  <span className="rounded-full bg-[var(--bq-agent-soft)] px-1.5 py-0.5 text-[9px] uppercase text-[var(--bq-agent-text)]  ">
                    grupo
                  </span>
                )}
                {picked && (
                  <MessageSquare className="h-4 w-4 shrink-0 text-[var(--bq-accent-text)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-[var(--bq-hair-strong)] px-6 py-3 ">
          <label className="block text-xs font-medium text-[var(--bq-t3)] ">
            Valor estimado (R$) — opcional
          </label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ex: 4500"
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-3 py-2 text-sm   "
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--bq-hair-strong)] bg-[var(--bq-raised-2)] px-6 py-3  ">
          <Button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--bq-t3)] hover:bg-[var(--bq-raised-2)]  "
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={saving || !pickedId}
            className="rounded-md bg-[var(--bq-accent)] px-4 py-1.5 text-sm font-medium text-[var(--bq-on-accent)] hover:bg-[var(--bq-accent-soft)] disabled:opacity-50"
          >
            {saving ? 'Adicionando…' : 'Adicionar ao pipeline'}
          </Button>
        </div>
      </div>
    </MacWindow>
  );
}
