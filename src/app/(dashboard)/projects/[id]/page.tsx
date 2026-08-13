'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { membersService } from '@/features/settings/services/members.service';
import { projectsService } from '@/features/projects/services/projects.service';
import {
  PHASE_LABELS,
  PROJECT_STATUSES,
  hoppeTaskUrl,
} from '@/features/projects/project-fields';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
const labelCls =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500';
const cardCls =
  'rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params?.id;

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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hoppeId, setHoppeId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('');

  useEffect(() => {
    if (!project) return;
    setName(project.name ?? '');
    setDescription(project.description ?? '');
    setHoppeId(project.hoppeId ?? '');
    setResponsibleUserId(project.responsibleUserId ?? '');
  }, [project]);

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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || project.exists === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-zinc-500">Dossiê não encontrado.</p>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="text-sm text-primary hover:underline"
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
    <div className="mx-auto h-full w-full max-w-4xl overflow-y-auto p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <FolderKanban className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {project.name || 'Dossiê'}
          </h1>
          <p className="text-xs text-zinc-500">
            Dossiê do holding, caso ou grupo específico
          </p>
        </div>
        {firstConversationId && (
          <Link
            href={`/inbox?conversationId=${firstConversationId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Abrir conversa
          </Link>
        )}
      </div>

      <div className="space-y-4">
        <section className={cardCls}>
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
              <span className={labelCls}>Descrição</span>
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
                    className="shrink-0 rounded-md p-1.5 text-primary hover:bg-primary/10"
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Salvar dados
          </button>
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
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
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </form>
          {tasks.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhuma tarefa.</p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900"
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
                    className="h-4 w-4 rounded border-zinc-300 text-primary"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.done
                        ? 'text-zinc-400 line-through'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTaskMutation.mutate(task.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
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
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Envolvidos
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
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ligar
            </button>
          </form>
          {contacts.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum envolvido.</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded-md border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {c.name || c.phone || c.email || c.contactId}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {[c.phone, c.email].filter(Boolean).join(' · ') ||
                        c.contactId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContactMutation.mutate(c.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
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
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Anexos
          </h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Nenhum anexo. Use o clipe na conversa para anexar uma mensagem.
            </p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                >
                  <div className="min-w-0">
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {a.label || a.fileName || 'Anexo'}
                      </a>
                    ) : (
                      <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                        {a.label || a.fileName || 'Anexo'}
                      </p>
                    )}
                    {a.fileName && a.label && a.fileName !== a.label && (
                      <p className="truncate text-xs text-zinc-500">
                        {a.fileName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachmentMutation.mutate(a.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
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
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Mail className="h-4 w-4 text-primary" />
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
      </div>
    </div>
  );
}
