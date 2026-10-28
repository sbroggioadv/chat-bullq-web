'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  FolderKanban,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Pill } from '@/components/ui/foundation';
import { membersService } from '@/features/settings/services/members.service';
import { projectsService } from '@/features/projects/services/projects.service';
import {
  PHASE_LABELS,
  phaseLabel,
  PROJECT_STATUSES,
  hoppeTaskUrl,
} from '@/features/projects/project-fields';

const inputCls =
  'w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2.5 py-1.5 text-sm text-[var(--bq-t1)] outline-none focus:border-[var(--bq-accent)] focus:ring-1 focus:ring-[var(--bq-accent)]   ';
const labelCls =
  'text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)] ';
const cardCls =
  'rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-4  ';

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });

  const [editingScope, setEditingScope] = useState(false);
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [hoppeId, setHoppeId] = useState(project?.hoppeId ?? '');
  const [responsibleUserId, setResponsibleUserId] = useState(project?.responsibleUserId ?? '');
  const [taskTitle, setTaskTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('');

  const [previousProject, setPreviousProject] = useState(project);
  if (project && project !== previousProject) {
    setPreviousProject(project);
    setName(project.name ?? '');
    setDescription(project.description ?? '');
    setHoppeId(project.hoppeId ?? '');
    setResponsibleUserId(project.responsibleUserId ?? '');
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      projectsService.update(projectId!, {
        name: name.trim(),
        description: description.trim() || undefined,
        hoppeId: hoppeId.trim() || undefined,
        responsibleUserId: responsibleUserId || undefined,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['project', projectId], saved);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingScope(false);
      toast.success('Dossiê salvo');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar'),
  });

  const phaseMutation = useMutation({
    mutationFn: (status: string) =>
      projectsService.update(projectId!, { status }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['project', projectId], saved);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Fase atualizada');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar fase'),
  });

  const addTaskMutation = useMutation({
    mutationFn: () => projectsService.addTask(projectId!, taskTitle.trim()),
    onSuccess: () => {
      setTaskTitle('');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar tarefa'),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) =>
      projectsService.updateTask(projectId!, taskId, { done }),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar tarefa'),
  });

  const removeTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      projectsService.removeTask(projectId!, taskId),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao remover tarefa'),
  });

  const addContactMutation = useMutation({
    mutationFn: () => projectsService.addContact(projectId!, contactId.trim()),
    onSuccess: () => {
      setContactId('');
      invalidate();
      toast.success('Contato ligado ao dossiê');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao ligar contato'),
  });

  const removeContactMutation = useMutation({
    mutationFn: (linkId: string) =>
      projectsService.removeContact(projectId!, linkId),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao remover contato'),
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      projectsService.removeAttachment(projectId!, attachmentId),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao remover anexo'),
  });

  const emailMutation = useMutation({
    mutationFn: () =>
      projectsService.emailParticipants(projectId!, {
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        to: emailTo.trim() || undefined,
      }),
    onSuccess: () => {
      setEmailSubject('');
      setEmailBody('');
      setEmailTo('');
      toast.success('E-mail enviado');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar e-mail'),
  });

  if (!projectId) return null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--bq-accent-text)]" />
      </div>
    );
  }

  if (!project || project.exists === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-[var(--bq-t3)]">Projeto não encontrado.</p>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="text-sm text-[var(--bq-accent-text)] hover:underline"
        >
          Voltar aos projetos
        </button>
      </div>
    );
  }

  const tasks = project.tasks ?? [];
  const contacts = project.contacts ?? [];
  const attachments = project.attachments ?? [];
  const firstConversationId = (project.conversationIds ?? [])[0];

  return (
    <div className="mx-auto h-full w-full min-w-0 overflow-y-auto p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="rounded-md p-1.5 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t1)]"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <FolderKanban className="h-5 w-5 text-[var(--bq-accent-text)]" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-[var(--bq-t1)]">
            {project.name || 'Dossiê'}
          </h1>
          <p className="text-xs text-[var(--bq-t3)]">
            Escopo, fase e informações do projeto
          </p>
        </div>
        {firstConversationId && (
          <Link
            href={`/inbox?conversationId=${firstConversationId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] px-3 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Abrir conversa
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2"><Pill tone="info">{phaseLabel(project.status) || 'Fase não informada'}</Pill><span className="text-xs text-[var(--bq-t3)]">{project.responsible?.name || 'Sem responsável'}</span></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={`${cardCls} xl:col-span-2`}>
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Escopo do projeto</h2><Button onClick={() => { setName(project.name ?? ''); setDescription(project.description ?? ''); setHoppeId(project.hoppeId ?? ''); setResponsibleUserId(project.responsibleUserId ?? ''); setEditingScope(v => !v); }}>{editingScope ? 'Cancelar edição' : 'Editar escopo e dados'}</Button></div>
          {!editingScope && <><p className="whitespace-pre-wrap text-[13px] text-[var(--bq-t2)]">{project.description || 'Escopo ainda não informado.'}</p><p className="mt-3 text-xs text-[var(--bq-t3)]">Responsável: {project.responsible?.name || 'Sem responsável'}</p>{project.hoppeId && <a className="bq-button mt-3" href={hoppeTaskUrl(project.hoppeId)} target="_blank" rel="noopener noreferrer">Abrir no Hoppe</a>}</>}
          <div hidden={!editingScope}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Nome</span>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Escopo do projeto</span>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo do holding, caso ou grupo específico…"
              />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Fase</span>
              <select
                className={inputCls}
                value={project.status ?? ''}
                disabled={phaseMutation.isPending}
                onChange={(e) => {
                  if (e.target.value) phaseMutation.mutate(e.target.value);
                }}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PHASE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Responsável</span>
              <select
                className={inputCls}
                value={responsibleUserId}
                onChange={(e) => setResponsibleUserId(e.target.value)}
              >
                <option value="">— Sem responsável —</option>
                {members
                  .filter((m) => m.user.isActive)
                  .map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Hoppe ID</span>
              <div className="flex items-center gap-1.5">
                <input
                  className={inputCls}
                  placeholder="ID da task no Hoppe (opcional)"
                  value={hoppeId}
                  onChange={(e) => setHoppeId(e.target.value)}
                />
                {hoppeId.trim() && (
                  <a
                    href={hoppeTaskUrl(hoppeId.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md p-1.5 text-[var(--bq-accent-text)] hover:bg-[var(--bq-accent-soft)]"
                    title="Abrir no Hoppe"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--bq-solid-bg)] px-3 py-1.5 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)] disabled:opacity-50"
          >
            {saveMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Salvar escopo e dados
          </button>
          </div>
        </section>
        {!editingScope && <section className={`${cardCls} xl:col-span-2`}><label className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">Fase em que está<select aria-label="Fase atual do projeto" value={project.status || ''} disabled={phaseMutation.isPending} onChange={e => phaseMutation.mutate(e.target.value)} className="rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] p-2 text-xs font-normal"><option value="" disabled>Selecione a fase</option>{PROJECT_STATUSES.map(status => <option value={status} key={status}>{PHASE_LABELS[status]}</option>)}</select></label></section>}

        <section className={`${cardCls} xl:col-span-2`}><h2 className="text-sm font-semibold">Fluxograma</h2><p className="mt-2 text-xs text-[var(--bq-t3)]">O fluxo deste projeto ainda não está disponível.</p></section>
        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--bq-t1)]">
            Tarefas
          </h2>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              addTaskMutation.mutate();
            }}
          >
            <input
              className={inputCls}
              placeholder="Nova tarefa"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <button
              type="submit"
              disabled={!taskTitle.trim() || addTaskMutation.isPending}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--bq-solid-bg)] px-3 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </form>
          {tasks.length === 0 ? (
            <p className="text-sm text-[var(--bq-t3)]">Nenhuma tarefa.</p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[var(--bq-surface)]"
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      toggleTaskMutation.mutate({
                        taskId: task.id,
                        done: !task.done,
                      })
                    }
                    className="h-4 w-4 rounded border-[var(--bq-hair-strong)] text-[var(--bq-accent-text)]"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.done
                        ? 'text-[var(--bq-t3)] line-through'
                        : 'text-[var(--bq-t1)] '
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTaskMutation.mutate(task.id)}
                    className="rounded p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-err)]"
                    aria-label="Remover tarefa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--bq-t1)]">
            Contatos e grupos
          </h2>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!contactId.trim()) return;
              addContactMutation.mutate();
            }}
          >
            <input
              className={inputCls}
              placeholder="ID do contato"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            />
            <button
              type="submit"
              disabled={!contactId.trim() || addContactMutation.isPending}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--bq-solid-bg)] px-3 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ligar
            </button>
          </form>
          {contacts.length === 0 ? (
            <p className="text-sm text-[var(--bq-t3)]">Nenhum envolvido.</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded-md border border-[var(--bq-hair)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--bq-t1)]">
                      {c.name || c.phone || c.email || c.contactId}
                    </p>
                    <p className="truncate text-xs text-[var(--bq-t3)]">
                      {[c.phone, c.email].filter(Boolean).join(' · ') ||
                        c.contactId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContactMutation.mutate(c.id)}
                    className="rounded p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-err)]"
                    aria-label="Remover envolvido"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--bq-t1)]">
            Documentos
          </h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-[var(--bq-t3)]">
              Nenhum anexo. Use o clipe na conversa para anexar uma mensagem.
            </p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--bq-hair)] px-3 py-2"
                >
                  <div className="min-w-0">
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-[var(--bq-accent-text)] hover:underline"
                      >
                        {a.label || a.fileName || 'Anexo'}
                      </a>
                    ) : (
                      <p className="truncate text-sm text-[var(--bq-t1)]">
                        {a.label || a.fileName || 'Anexo'}
                      </p>
                    )}
                    {a.fileName && a.label && a.fileName !== a.label && (
                      <p className="truncate text-xs text-[var(--bq-t3)]">
                        {a.fileName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachmentMutation.mutate(a.id)}
                    className="rounded p-1 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-err)]"
                    aria-label="Remover anexo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--bq-t1)]">
            <Mail className="h-4 w-4 text-[var(--bq-accent-text)]" />
            E-mail
          </h2>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailSubject.trim() || !emailBody.trim()) {
                toast.error('Preencha assunto e corpo');
                return;
              }
              emailMutation.mutate();
            }}
          >
            <input
              className={inputCls}
              placeholder="Assunto"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <textarea
              className={`${inputCls} min-h-[96px] resize-y`}
              placeholder="Corpo do e-mail"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Destinatário extra (opcional)"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
            <button
              type="submit"
              disabled={emailMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bq-solid-bg)] px-3 py-1.5 text-sm font-medium text-[var(--bq-solid-fg)] hover:bg-[var(--bq-solid-bg)] disabled:opacity-50"
            >
              {emailMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Enviar e-mail
            </button>
          </form>
        </section>
        <section className={cardCls}><h2 className="text-sm font-semibold">Contrato e honorários</h2><p className="mt-2 text-xs text-[var(--bq-t3)]">Valor contratado e assinaturas ainda não disponíveis.</p></section>
        <section className={cardCls}><h2 className="text-sm font-semibold">Reuniões</h2><p className="mt-2 text-xs text-[var(--bq-t3)]">Histórico e agendamento pelo projeto ainda não disponíveis.</p></section>
        <section className={cardCls}><h2 className="text-sm font-semibold">ClickUp</h2><p className="mt-2 text-xs text-[var(--bq-t3)]">O caso vinculado a este projeto ainda não está disponível.</p>{firstConversationId && <Link className="bq-button mt-3" href={`/inbox?conversationId=${firstConversationId}`}>Abrir conversa do projeto</Link>}</section>
      </div>
    </div>
  );
}
