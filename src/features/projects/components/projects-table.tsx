'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ProjectDetail } from '@/features/projects/components/project-detail';
import { Button, Pill } from '@/components/ui/foundation';
import { Search, FolderKanban, Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { membersService } from '@/features/settings/services/members.service';
import { projectsService } from '@/features/projects/services/projects.service';
import {
  PROJECT_STATUSES,
  PHASE_LABELS,
  phaseLabel,
} from '@/features/projects/project-fields';

const controlCls =
  'h-9 rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2.5 text-sm text-[var(--bq-t1)] outline-none focus:border-[var(--bq-accent)] focus:ring-1 focus:ring-[var(--bq-accent)]   ';

export function ProjectsTable() {
  const orgId = useOrgId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<(typeof PROJECT_STATUSES)[number]>(
    'TODO',
  );

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', orgId, { status, responsibleUserId }],
    queryFn: () =>
      projectsService.list({
        status: status || undefined,
        responsibleUserId: responsibleUserId || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsService.create({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        status: newStatus,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (created.id) {
        setSearch('');
        setStatus('');
        setResponsibleUserId('');
        setSelectedId(created.id);
        setMobileDetail(true);
        setCreating(false);
      } else {
        toast.error('Projeto criado sem identificador');
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao criar projeto'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const withId = rows.filter((r) => r.id);
    if (!q) return withId;
    return withId.filter((r) => {
      const name = (r.name ?? '').toLowerCase();
      const description = (r.description ?? '').toLowerCase();
      return name.includes(q) || description.includes(q);
    });
  }, [rows, search]);



  const resetCreate = () => {
    setCreating(false);
    setNewName('');
    setNewDescription('');
    setNewStatus('TODO');
  };

  return (
    <div className="flex h-full min-w-0 text-[var(--bq-t1)]">
    <aside aria-label="Lista de projetos" className={`${mobileDetail ? 'hidden md:block' : 'block'} h-full w-full shrink-0 overflow-y-auto border-r border-[var(--bq-hair)] p-4 md:w-[310px]`}>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-[var(--bq-accent-text)]" />
            <h1 className="text-lg font-semibold text-[var(--bq-t1)]">
              Projetos
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--bq-t3)]">
            Escopo e acompanhamento dos seus projetos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--bq-solid-bg)] px-3 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)]"
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          Novo projeto
        </button>
      </div>

      {creating && (
        <form
          className="mt-5 space-y-3 rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) {
              toast.error('Informe o nome do projeto');
              return;
            }
            createMutation.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                Nome
              </span>
              <input
                className={`${controlCls} w-full`}
                placeholder="Nome do dossiê"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                Fase
              </span>
              <select
                className={`${controlCls} w-full`}
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(e.target.value as (typeof PROJECT_STATUSES)[number])
                }
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PHASE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
              Descrição
            </span>
            <textarea
              className={`${controlCls} min-h-[72px] w-full py-2`}
              placeholder="Resumo do holding, caso ou grupo específico…"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--bq-solid-bg)] px-3 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)] disabled:opacity-50"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Criar
            </button>
            <button
              type="button"
              onClick={resetCreate}
              className="h-9 rounded-lg px-3 text-sm text-[var(--bq-t3)] hover:bg-[var(--bq-raised)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bq-t3)]" />
          <input
            aria-label="Buscar projetos" className={`${controlCls} w-full pl-8`}
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${controlCls} w-full`}
          aria-label="Filtrar por fase"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todas as fases</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PHASE_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className={`${controlCls} w-full`}
          aria-label="Filtrar por responsável"
          value={responsibleUserId}
          onChange={(e) => setResponsibleUserId(e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          {members
            .filter((m) => m.user.isActive)
            .map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
        </select>
      </div>

      <div className="mt-4 border-b border-[var(--bq-hair)] pb-3 text-xs text-[var(--bq-t3)]">Tags: ainda não disponíveis.</div>
      <div className="mt-3 space-y-2">
        {isLoading ? <p role="status" className="p-3 text-sm text-[var(--bq-t3)]">Carregando projetos…</p> : isError ? <div role="alert" className="p-3 text-sm">Não foi possível carregar os projetos. <Button onClick={() => void refetch()}>Tentar novamente</Button></div> : filtered.length === 0 ? <p className="p-3 text-sm text-[var(--bq-t3)]">Nenhum projeto encontrado.</p> : filtered.map(project => <button type="button" key={project.id!}
          aria-pressed={(selectedId || filtered[0]?.id) === project.id}
          onClick={() => { setSelectedId(project.id!); setMobileDetail(true); }}
          className={`w-full space-y-2 rounded-xl border p-3 text-left transition-colors hover:bg-[var(--bq-raised)] ${(selectedId || filtered[0]?.id) === project.id ? 'border-[var(--bq-hair-strong)] bg-[var(--bq-accent-soft)]' : 'border-[var(--bq-hair)] bg-[var(--bq-surface)]'}`}>
          <span className="block text-[13px] font-semibold">{project.name}</span>
          {project.description && <span className="line-clamp-2 text-xs text-[var(--bq-t3)]">{project.description}</span>}
          <span className="flex flex-wrap items-center gap-2"><Pill tone="info">{phaseLabel(project.status) || 'Sem fase'}</Pill><span className="text-[11px] text-[var(--bq-t3)]">{project.responsible?.name || 'Sem responsável'}</span></span>
          <span className="block text-[11px] text-[var(--bq-t3)]">{(project.tasks || []).filter(task => !task.done).length}/{(project.tasks || []).length} tarefas pendentes</span>
        </button>)}
      </div>
    </div>
    </aside>
    <main className={`${mobileDetail ? 'flex' : 'hidden md:flex'} h-full min-w-0 flex-1 flex-col`}>
      {mobileDetail && <Button className="m-3 md:hidden" onClick={() => setMobileDetail(false)}>← Lista de projetos</Button>}
      {(() => {
        const id = filtered.some(project => project.id === selectedId) ? selectedId : filtered[0]?.id;
        return id ? <div className="flex min-h-0 flex-1 flex-col"><Link className="bq-button m-3 self-end" href={`/projects/${id}`}>Abrir página do projeto</Link><div className="min-h-0 flex-1"><ProjectDetail key={id} projectId={id} /></div></div> : <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--bq-t3)]">Selecione ou crie um projeto para acompanhar o escopo e a fase.</div>;
      })()}
    </main>
    </div>
  );
}
