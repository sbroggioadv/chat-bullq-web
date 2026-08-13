'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  X,
  ExternalLink,
  Loader2,
  FolderKanban,
  Link2,
} from 'lucide-react';
import { membersService } from '@/features/settings/services/members.service';
import {
  projectsService,
  type Project,
} from '@/features/projects/services/projects.service';
import {
  PROJECT_FIELDS,
  PROJECT_STATUSES,
  hoppeTaskUrl,
  phaseLabel,
  type ProjectFieldDef,
} from '@/features/projects/project-fields';

interface ProjectPanelProps {
  conversationId: string;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
const labelCls =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500';

/**
 * Painel lateral de Projeto (dossiê). Se já existe, mostra resumo + link
 * para a página cheia. Se não, cria via PUT by-conversation ou liga a um
 * dossiê existente.
 */
export function ProjectPanel({ conversationId, onClose }: ProjectPanelProps) {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', conversationId],
    queryFn: () => projectsService.getByConversation(conversationId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });

  const { data: existingProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.list(),
    enabled: !project?.exists,
  });

  const [createName, setCreateName] = useState('');
  const [createStatus, setCreateStatus] = useState<string>('TODO');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const activeMembers = useMemo(
    () => members.filter((m) => m.user.isActive),
    [members],
  );

  const onLinked = (saved: Project) => {
    queryClient.setQueryData(['project', conversationId], saved);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      projectsService.updateByConversation(conversationId, {
        name: createName.trim(),
        status: createStatus || undefined,
      }),
    onSuccess: (saved) => {
      onLinked(saved);
      toast.success('Dossiê criado e ligado a esta conversa');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao criar dossiê'),
  });

  const linkMutation = useMutation({
    mutationFn: () =>
      projectsService.linkConversation(selectedProjectId, conversationId),
    onSuccess: (saved) => {
      onLinked(saved);
      toast.success('Conversa ligada ao dossiê');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao ligar dossiê'),
  });

  const exists = !!project?.exists && !!project.id;
  const tasks = project?.tasks ?? [];
  const pending = tasks.filter((t) => !t.done).length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Projeto
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : exists ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {project.name || 'Dossiê'}
              </p>
              {project.status && (
                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {phaseLabel(project.status)}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                {project.description}
              </p>
            )}
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              Abrir dossiê completo
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <div className="space-y-1.5">
              <p className={labelCls}>Tarefas</p>
              {tasks.length === 0 ? (
                <p className="text-[13px] text-zinc-400">Nenhuma tarefa.</p>
              ) : (
                <>
                  <p className="text-[12px] text-zinc-500">
                    {pending} de {tasks.length} em aberto
                  </p>
                  <ul className="space-y-1">
                    {tasks.slice(0, 5).map((t) => (
                      <li
                        key={t.id}
                        className={`text-[13px] ${
                          t.done
                            ? 'text-zinc-400 line-through'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {t.title}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            {PROJECT_FIELDS.filter(
              (f) => f.key === 'hoppeId' || f.key === 'responsibleUserId',
            ).map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={
                  field.key === 'hoppeId'
                    ? project.hoppeId ?? ''
                    : project.responsibleUserId ?? ''
                }
                onChange={() => undefined}
                members={activeMembers}
                readOnly
              />
            ))}
          </>
        ) : (
          <>
            <p className="text-[13px] text-zinc-500">
              Esta conversa ainda não tem dossiê. Crie um ou ligue a um
              existente.
            </p>
            <FieldRow
              field={PROJECT_FIELDS.find((f) => f.key === 'name')!}
              value={createName}
              onChange={setCreateName}
              members={activeMembers}
            />
            <FieldRow
              field={PROJECT_FIELDS.find((f) => f.key === 'status')!}
              value={createStatus}
              onChange={setCreateStatus}
              members={activeMembers}
            />
            <button
              type="button"
              onClick={() => {
                if (!createName.trim()) {
                  toast.error('Informe o nome do dossiê');
                  return;
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderKanban className="h-4 w-4" />
              )}
              Criar dossiê
            </button>

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className={labelCls}>Ou ligar a um existente</p>
              <select
                className={`${inputCls} mt-1.5`}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">Selecionar dossiê…</option>
                {existingProjects
                  .filter((p) => p.id)
                  .map((p) => (
                    <option key={p.id!} value={p.id!}>
                      {p.name || p.id}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!selectedProjectId) {
                    toast.error('Selecione um dossiê');
                    return;
                  }
                  linkMutation.mutate();
                }}
                disabled={linkMutation.isPending || !selectedProjectId}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {linkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Ligar ao selecionado
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  members,
  readOnly,
}: {
  field: ProjectFieldDef;
  value: string;
  onChange: (v: string) => void;
  members: { user: { id: string; name: string } }[];
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea
          className={`${inputCls} min-h-[72px] resize-y`}
          placeholder={field.placeholder}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'select' ? (
        <select
          className={inputCls}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? PROJECT_STATUSES).map((opt) => (
            <option key={opt} value={opt}>
              {field.key === 'status' ? phaseLabel(opt) : opt}
            </option>
          ))}
        </select>
      ) : field.type === 'user' ? (
        <select
          className={inputCls}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Sem responsável —</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>
      ) : field.type === 'link' ? (
        <div className="flex items-center gap-1.5">
          <input
            className={inputCls}
            placeholder={field.placeholder}
            value={value}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
          {value.trim() && (
            <a
              href={hoppeTaskUrl(value.trim())}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no Hoppe"
              className="shrink-0 rounded-md p-1.5 text-primary hover:bg-primary/10"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ) : (
        <input
          className={inputCls}
          placeholder={field.placeholder}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
