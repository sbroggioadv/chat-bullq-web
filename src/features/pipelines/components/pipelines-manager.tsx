'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, KanbanSquare, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/foundation';
import {
  pipelinesService,
  type Pipeline,
} from '@/features/pipelines/services/pipelines.service';

export function PipelinesManager({ initialCreating = false, onNavigate }: { initialCreating?: boolean; onNavigate?: () => void }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(initialCreating);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: pipelines = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const p = await pipelinesService.create({ name: name.trim() });
      toast.success(`Pipeline "${p.name}" criado com 5 etapas padrão`);
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setName('');
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Pipeline) => {
    if (!confirm(`Excluir o pipeline "${p.name}" e todos os cards?`)) return;
    try {
      await pipelinesService.remove(p.id);
      toast.success('Pipeline removido');
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleSetDefault = async (p: Pipeline) => {
    try {
      await pipelinesService.update(p.id, { isDefault: true });
      toast.success(`"${p.name}" agora é o pipeline padrão`);
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--bq-t1)]">
            <KanbanSquare className="h-5 w-5 text-[var(--bq-accent-text)]" />
            Pipelines
          </h1>
          <p className="mt-0.5 text-sm text-[var(--bq-t3)]">
            Conversas e negociações organizadas por etapas.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--bq-solid-bg)] px-4 py-2 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)]"
        >
          <Plus className="h-4 w-4" />
          Novo pipeline
        </button>
      </div>

      {creating && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do pipeline (ex: Vendas Mentoria)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            className="min-w-0 flex-1 basis-full rounded-md sm:basis-0 border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="rounded-md bg-[var(--bq-solid-bg)] px-3 py-1.5 text-sm font-medium text-[var(--bq-solid-fg)] disabled:opacity-50"
          >
            {saving ? '…' : 'Criar'}
          </button>
          <button
            onClick={() => setCreating(false)}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--bq-t2)]"
          >
            Cancelar
          </button>
        </div>
      )}

      {isError && <p role="alert" className="mt-4">Não foi possível carregar os pipelines. <Button onClick={() => void refetch()}>Tentar novamente</Button></p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {isLoading && (
          <div className="col-span-full text-center text-sm text-[var(--bq-t3)]">
            Carregando…
          </div>
        )}
        {!isLoading && !isError && pipelines.length === 0 && (
          <div className="col-span-full rounded-xl border-2 border-dashed border-[var(--bq-hair)] p-10 text-center">
            <KanbanSquare className="mx-auto h-10 w-10 text-[var(--bq-t3)]" />
            <p className="mt-3 text-sm font-medium text-[var(--bq-t2)]">
              Nenhum pipeline criado ainda
            </p>
            <p className="mt-1 text-xs text-[var(--bq-t3)]">
              Clique em “Novo pipeline” para começar com 5 etapas padrão.
            </p>
          </div>
        )}
        {pipelines.map((p) => (
          <div
            key={p.id}
            className="group relative rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-4 hover:border-[var(--bq-hair-strong)] hover:shadow-sm"
          >
            <Link onClick={onNavigate} href={`/pipelines/${p.id}`} className="block pr-10">
              <div className="flex items-center gap-2">
                <KanbanSquare className="h-4 w-4" style={{ color: ({ green: 'var(--bq-ok)', pink: 'var(--bq-ig)', violet: 'var(--bq-agent)', blue: 'var(--bq-info)', amber: 'var(--bq-warn)', red: 'var(--bq-err)' } as Record<string, string>)[p.color ?? ''] ?? 'var(--bq-t3)' }} />
                <h3 className="text-sm font-semibold text-[var(--bq-t1)]">
                  {p.name}
                </h3>
                {p.isDefault && (
                  <Star
                    className="h-3.5 w-3.5 text-[var(--bq-warn)]"
                    fill="currentColor"
                  />
                )}
              </div>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-xs text-[var(--bq-t3)]">
                  {p.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--bq-t3)]">
                <span>
                  {p.stages?.length ?? 0} etapas · {p._count?.cards ?? 0} cards
                </span>
              </div>
            </Link>
            <div className="absolute right-2 top-2 flex gap-1 transition-opacity">
              {!p.isDefault && (
                <button
                  onClick={() => handleSetDefault(p)}
                  title="Marcar como padrão"
                  className="rounded p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-warn-soft)] hover:text-[var(--bq-warn)]"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                aria-label={`Excluir pipeline ${p.name}`}
                onClick={() => handleDelete(p)}
                className="rounded p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-err-soft)] hover:text-[var(--bq-err)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
