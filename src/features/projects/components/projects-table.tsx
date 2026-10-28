'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectDetail } from '@/features/projects/components/project-detail';
import { Button, MacWindow, FoundationPopover } from '@/components/ui/foundation';
import { Search, Plus, Loader2 } from 'lucide-react';
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

  const activeId = filtered.some(project => project.id === selectedId) ? selectedId : filtered[0]?.id;
  return (
    <div className="flex h-full min-w-0 flex-row text-[var(--bq-t1)] bq-through-project:flex-col">
      <aside aria-label="Lista de projetos" className="flex min-h-0 w-bq-size-project-list shrink-0 flex-col border-r border-[var(--bq-hair)] bq-through-project:max-h-[var(--bq-size-40percent)] bq-through-project:w-full bq-through-project:border-r-0 bq-through-project:border-b">
        <div className="flex items-center gap-2 p-bq-space-section"><h1 className="flex-1 font-[family-name:var(--bq-f-display)] text-bq-text-list-title font-semibold tracking-tight">Projetos</h1><Button variant="solid" onClick={() => setCreating(true)}><Plus size={13} />Novo projeto</Button></div>
        <div className="flex flex-wrap items-center gap-bq-space-label px-bq-space-section pb-2.5" role="group" aria-label="Filtros de projetos">
          <button type="button" aria-pressed={!status && !responsibleUserId && !search} onClick={() => { setStatus(''); setResponsibleUserId(''); setSearch(''); }} className={`inline-flex items-center gap-bq-space-compact h-6 rounded-bq-radius-pill border px-bq-space-row text-bq-text-auxiliary ${!status && !responsibleUserId && !search ? 'border-[var(--bq-t1)] bg-[var(--bq-t1)] text-[var(--bq-win-solid)]' : 'border-[var(--bq-hair-strong)] text-[var(--bq-t2)]'}`}>Todas</button>
          {PROJECT_STATUSES.map(value => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(status === value ? '' : value)} className={`inline-flex items-center gap-bq-space-compact h-bq-size-compact-control rounded-bq-radius-pill border px-bq-space-row text-bq-text-auxiliary ${status === value ? 'border-[var(--bq-t1)] bg-[var(--bq-t1)] text-[var(--bq-win-solid)]' : 'border-[var(--bq-hair-strong)] text-[var(--bq-t2)]'}`}>{PHASE_LABELS[value]}</button>)}
          <span className="text-bq-text-auxiliary text-[var(--bq-t3)]">Tags ainda não disponíveis</span>
          <FoundationPopover label="Buscar e filtrar"><div className="flex max-w-bq-size-attachment-min flex-col gap-3 p-2">
            <label className="text-xs">Buscar projetos<div className="relative mt-1"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-[var(--bq-t3)]" /><input className={`${controlCls} w-full pl-8`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou descrição" /></div></label>
            <label className="text-xs">Filtrar por fase<select className={`${controlCls} mt-1 w-full`} value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas as fases</option>{PROJECT_STATUSES.map(value => <option key={value} value={value}>{PHASE_LABELS[value]}</option>)}</select></label>
            <label className="text-xs">Filtrar por responsável<select className={`${controlCls} mt-1 w-full`} value={responsibleUserId} onChange={e => setResponsibleUserId(e.target.value)}><option value="">Todos os responsáveis</option>{members.filter(m => m.user.isActive).map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select></label>
            <p className="text-xs text-[var(--bq-t3)]">Tags: ainda não disponíveis.</p>
          </div></FoundationPopover>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
          {isLoading ? <p role="status" className="p-3 text-sm text-[var(--bq-t3)]">Carregando projetos…</p> : isError ? <div role="alert" className="p-3 text-sm">Não foi possível carregar os projetos. <Button onClick={() => void refetch()}>Tentar novamente</Button></div> : filtered.length === 0 ? <p className="p-3 text-sm text-[var(--bq-t3)]">Nenhum projeto encontrado.</p> : filtered.map(project => {
            const phaseIndex = PROJECT_STATUSES.findIndex(status => status === project.status);
            return <button type="button" key={project.id!} aria-pressed={activeId === project.id} onClick={() => setSelectedId(project.id!)} className={`flex w-full shrink-0 flex-col gap-bq-space-control rounded-xl p-bq-space-panel text-left hover:bg-[var(--bq-raised)] ${activeId === project.id ? 'bg-[var(--bq-raised-2)] shadow-[inset_0_0_0_var(--bq-border-hairline)_var(--bq-hair)]' : ''}`}>
              <span className="text-bq-text-body font-semibold">{project.name}</span>
              <span role="img" aria-label={`Fase de ${project.name}: ${phaseLabel(project.status) || 'não informada'}`} className="flex w-full gap-bq-space-step">{PROJECT_STATUSES.map((status, index) => <span key={status} className={`h-1 min-w-0 flex-1 rounded-bq-radius-step ${index === phaseIndex ? 'bg-[var(--bq-accent)]' : 'bg-[var(--bq-raised-2)]'}`} />)}</span>
              <span className="flex justify-between gap-2 text-bq-text-auxiliary text-[var(--bq-t3)]"><span>{phaseLabel(project.status) || 'Sem fase'}</span><span>{project.responsible?.name || 'Sem responsável'}</span></span>
            </button>;
          })}
        </div>
      </aside>
      <main className="min-h-0 min-w-0 flex-1">
        {activeId ? <ProjectDetail key={activeId} projectId={activeId} embedded /> : <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--bq-t3)]">Selecione ou crie um projeto para acompanhar o escopo e a fase.</div>}
      </main>
      <MacWindow open={creating} onClose={resetCreate} title="Novo projeto">
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
              <span className="text-bq-text-metadata font-medium uppercase tracking-wide text-[var(--bq-t3)]">
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
              <span className="text-bq-text-metadata font-medium uppercase tracking-wide text-[var(--bq-t3)]">
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
            <span className="text-bq-text-metadata font-medium uppercase tracking-wide text-[var(--bq-t3)]">
              Descrição
            </span>
            <textarea
              className={`${controlCls} min-h-bq-size-textarea w-full py-2`}
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
      </MacWindow>
    </div>
  );
}
