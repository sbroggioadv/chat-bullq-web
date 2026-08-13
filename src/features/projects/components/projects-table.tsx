'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { membersService } from '@/features/settings/services/members.service';
import { projectsService } from '../services/projects.service';
import {
  PROJECT_STATUSES,
  PHASE_LABELS,
  phaseLabel,
} from '../project-fields';

const controlCls =
  'h-9 rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export function ProjectsTable() {
  const orgId = useOrgId();
  const router = useRouter();
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

  const { data: rows = [], isLoading } = useQuery({
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
        router.push(`/projects/${created.id}`);
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

  const openProject = (id: string) => {
    router.push(`/projects/${id}`);
  };

  const resetCreate = () => {
    setCreating(false);
    setNewName('');
    setNewDescription('');
    setNewStatus('TODO');
  };

  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Projetos
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Dossiês de holding, caso ou grupo específico. Um grupo de WhatsApp
            não é um projeto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          Novo projeto
        </button>
      </div>

      {creating && (
        <form
          className="mt-5 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
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
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
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
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
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
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
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
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Criar
            </button>
            <button
              type="button"
              onClick={resetCreate}
              className="h-9 rounded-lg px-3 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className={`${controlCls} w-64 pl-8`}
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={controlCls}
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
          className={controlCls}
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

      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Projeto</th>
              <th className="px-4 py-2.5 font-medium">Fase</th>
              <th className="px-4 py-2.5 font-medium">Responsável</th>
              <th className="px-4 py-2.5 font-medium">Tarefas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  </td>
                </tr>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((r) => {
                const tasks = r.tasks ?? [];
                const openCount = tasks.filter((t) => !t.done).length;
                return (
                  <tr
                    key={r.id!}
                    onClick={() => openProject(r.id!)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {r.name}
                      </div>
                      {r.description && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {phaseLabel(r.status)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {r.responsible?.name ?? (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {tasks.length > 0 ? (
                        <span>
                          {openCount}/{tasks.length}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0/0</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-zinc-400"
                >
                  Nenhum projeto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
