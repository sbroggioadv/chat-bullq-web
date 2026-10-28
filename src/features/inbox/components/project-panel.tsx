'use client';

import { Button } from '@/components/ui/foundation';
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
  'w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2.5 py-1.5 text-[13px] text-[var(--bq-t1)] outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary   ';
const labelCls =
  'text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)] ';

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

  const [taskTitle, setTaskTitle] = useState('');
  const taskMutation = useMutation({
    mutationFn: async (task?: { id: string; done: boolean }) => {
      if (!project?.id) throw new Error('Vincule um projeto primeiro');
      return task ? projectsService.updateTask(project.id, task.id, { done: !task.done }) : projectsService.addTask(project.id, taskTitle.trim());
    },
    onSuccess: saved => { onLinked(saved); setTaskTitle(''); },
    onError: () => toast.error('Não foi possível salvar a tarefa'),
  });

  const exists = !!project?.exists && !!project.id;
  const tasks = project?.tasks ?? [];
  const pending = tasks.filter((t) => !t.done).length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-[var(--bq-hair)] bg-[var(--bq-win-solid)]  ">
      <div className="flex items-center justify-between border-b border-[var(--bq-hair)] px-4 py-3 ">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-[var(--bq-t1)] ">
            Projeto
          </span>
        </div>
        <button
          aria-label="Fechar projeto"
          onClick={onClose}
          className="rounded-md p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t2)] "
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
                className="h-12 animate-pulse rounded-md bg-[var(--bq-raised)] "
              />
            ))}
          </div>
        ) : exists ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--bq-t1)] ">
                {project.name || 'Dossiê'}
              </p>
              {project.status && (
                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {phaseLabel(project.status)}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-[13px] leading-relaxed text-[var(--bq-t2)] ">
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
                <p className="text-[13px] text-[var(--bq-t3)]">Nenhuma tarefa.</p>
              ) : (
                <>
                  <p className="text-[12px] text-[var(--bq-t2)]">
                    {pending} de {tasks.length} em aberto
                  </p>
                  <ul className="space-y-1">
                    {tasks.map((t) => (
                      <li
                        key={t.id}
                        className={`text-[13px] ${
                          t.done
                            ? 'text-[var(--bq-t3)] line-through'
                            : 'text-[var(--bq-t2)] '
                        }`}
                      >
                        <label className="flex items-start gap-2"><input type="checkbox" checked={t.done} disabled={taskMutation.isPending} onChange={() => taskMutation.mutate(t)} />{t.title}</label>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (taskTitle.trim()) taskMutation.mutate(undefined); }}>
              <input aria-label="Nova tarefa do projeto" placeholder="Adicionar tarefa…" className={inputCls} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              <Button type="submit" disabled={!taskTitle.trim() || taskMutation.isPending}>Adicionar</Button>
            </form>
            <section className="space-y-2"><h3 className={labelCls}>Anexos do projeto</h3>
              {project.attachments?.length ? project.attachments.map(file => <div key={file.id} className="text-xs">{file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="underline">{file.label || file.fileName}</a> : <span>{file.label || file.fileName} · arquivo indisponível</span>}</div>) : <p className="text-xs text-[var(--bq-t3)]">Nenhum anexo. Use “Anexar ao projeto” em uma mensagem.</p>}
            </section>
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
            <p className="text-[13px] text-[var(--bq-t2)]">
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

            <div className="border-t border-[var(--bq-hair)] pt-4 ">
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
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--bq-hair-strong)] px-4 py-2 text-sm font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)] disabled:opacity-50   "
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
