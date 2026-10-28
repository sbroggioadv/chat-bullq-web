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
    <div className="flex h-full min-w-0 flex-col text-[var(--bq-t1)] md:flex-row">
      <aside aria-label="Lista de projetos" className="flex max-h-[40%] w-full shrink-0 flex-col border-b border-[var(--bq-hair)] md:max-h-none md:w-[300px] md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 p-[14px]"><h1 className="flex-1 font-[family-name:var(--bq-f-display)] text-[17px] font-semibold tracking-tight">Projetos</h1><Button variant="solid" onClick={() => setCreating(true)}><Plus size={13} />Novo projeto</Button></div>
        <div className="flex flex-wrap gap-[5px] px-[14px] pb-2.5" role="group" aria-label="Filtrar projetos por fase">
          {[{ value: '', label: 'Todas' }, ...PROJECT_STATUSES.map(value => ({ value, label: PHASE_LABELS[value] }))].map(option => <button type="button" key={option.value} aria-pressed={status === option.value} onClick={() => setStatus(option.value)} className={`h-6 rounded-full border px-[9px] text-[11.5px] ${status === option.value ? 'border-transparent bg-[var(--bq-solid-bg)] text-[var(--bq-solid-fg)]' : 'border-[var(--bq-hair-strong)] text-[var(--bq-t2)]'}`}>{option.label}</button>)}
          <FoundationPopover label="Buscar e filtrar"><div className="flex max-w-[250px] flex-col gap-3 p-2">
            <label className="text-xs">Buscar projetos<div className="relative mt-1"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-[var(--bq-t3)]" /><input className={`${controlCls} w-full pl-8`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou descrição" /></div></label>
            <label className="text-xs">Filtrar por responsável<select className={`${controlCls} mt-1 w-full`} value={responsibleUserId} onChange={e => setResponsibleUserId(e.target.value)}><option value="">Todos os responsáveis</option>{members.filter(m => m.user.isActive).map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select></label>
            <p className="text-xs text-[var(--bq-t3)]">Tags: ainda não disponíveis.</p>
          </div></FoundationPopover>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
          {isLoading ? <p role="status" className="p-3 text-sm text-[var(--bq-t3)]">Carregando projetos…</p> : isError ? <div role="alert" className="p-3 text-sm">Não foi possível carregar os projetos. <Button onClick={() => void refetch()}>Tentar novamente</Button></div> : filtered.length === 0 ? <p className="p-3 text-sm text-[var(--bq-t3)]">Nenhum projeto encontrado.</p> : filtered.map(project => {
            const total = project.tasks?.length ?? 0;
            const done = (project.tasks ?? []).filter(task => task.done).length;
            return <button type="button" key={project.id!} aria-pressed={activeId === project.id} onClick={() => setSelectedId(project.id!)} className={`flex w-full shrink-0 flex-col gap-[7px] rounded-xl p-[11px] text-left hover:bg-[var(--bq-raised)] ${activeId === project.id ? 'bg-[var(--bq-raised-2)] shadow-[inset_0_0_0_1px_var(--bq-hair)]' : ''}`}>
              <span className="text-[13px] font-semibold">{project.name}</span>
              {total > 0 ? <><progress aria-label={`Progresso de ${project.name}`} className="h-1 w-full overflow-hidden rounded [&::-webkit-progress-bar]:bg-[var(--bq-raised-2)] [&::-webkit-progress-value]:bg-[var(--bq-ok)] [&::-moz-progress-bar]:bg-[var(--bq-ok)]" value={done} max={total} /><span className="text-[11px] text-[var(--bq-t3)]">{done}/{total} tarefas concluídas</span></> : <span className="text-[11px] text-[var(--bq-t3)]">Progresso indisponível · sem tarefas</span>}
              <span className="flex justify-between gap-2 text-[11.5px] text-[var(--bq-t3)]"><span>{phaseLabel(project.status) || 'Sem fase'}</span><span>{project.responsible?.name || 'Sem responsável'}</span></span>
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
      </MacWindow>
    </div>
  );
}
