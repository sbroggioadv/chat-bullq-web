'use client';

import { ApiClientError } from '@/lib/api';
import { Fragment, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Coins,
  Briefcase,
  ExternalLink,
  FileText,
  Paperclip,
  ListChecks,
  Sparkles,
  ChevronRight,
  Check,
  Upload,
  Users,
  Calendar,
  PenLine,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, MacWindow } from '@/components/ui/foundation';
import { Avatar } from '@/components/ui/avatar';
import { mockupAvatarHue } from '@/components/ui/avatar-hue';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { membersService } from '@/features/settings/services/members.service';
import { projectsService } from '@/features/projects/services/projects.service';
import {
  PHASE_LABELS,
  PROJECT_STATUSES,
  hoppeTaskUrl,
  projectPhaseState,
} from '@/features/projects/project-fields';

const inputCls =
  'w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2.5 py-1.5 text-sm text-[var(--bq-t1)] outline-none focus:border-[var(--bq-accent)] focus:ring-1 focus:ring-[var(--bq-accent)]   ';
const labelCls =
  'text-bq-text-metadata font-medium uppercase tracking-wide text-[var(--bq-t3)] ';
const cardCls =
  'flex flex-col gap-bq-space-panel min-w-0 shrink-0 [overflow-wrap:anywhere] rounded-2xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-4 py-bq-space-section';

export function ProjectDetail({ projectId, onBack, embedded = false }: { projectId: string; onBack?: () => void; embedded?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading, isError, error, refetch } = useQuery({
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
  const [contactSearch, setContactSearch] = useState('');
  const [panel, setPanel] = useState<'tasks' | 'email' | 'contacts' | null>(null);
  const { data: contactResults, isLoading: contactsLoading, isError: contactsError, refetch: retryContacts } = useQuery({
    queryKey: ['project-contact-search', contactSearch],
    queryFn: () => contactsService.list({ search: contactSearch, limit: '20' }),
    enabled: panel === 'contacts',
  });
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
      setPanel(null);
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

  if ((isError && !(error instanceof ApiClientError && error.status === 404)) || (!project && !isError)) {
    return <div className="flex h-full flex-col items-center justify-center gap-3 p-6"><p role="alert">Não foi possível carregar o projeto.</p><Button onClick={() => void refetch()}>Tentar novamente</Button><Button onClick={onBack ?? (() => router.push('/projects'))}>Voltar aos projetos</Button></div>;
  }

  if (!project || project.exists === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-[var(--bq-t3)]">Projeto não encontrado.</p>
        <button
          type="button"
          onClick={onBack ?? (() => router.push('/projects'))}
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

  const phaseIndex = PROJECT_STATUSES.findIndex(status => status === project.status);
  const done = tasks.filter(task => task.done).length;
  return (
    <div data-project-detail className="flex h-full min-w-0 flex-col gap-bq-space-section overflow-y-auto px-bq-space-detail pb-6 pt-bq-space-content">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="font-[family-name:var(--bq-f-display)] text-bq-text-detail-title font-medium leading-bq-leading-display tracking-bq-tracking-display [text-wrap:balance]">{project.name || 'Dossiê'}</h1>
          <p className="mt-1.5 text-xs text-[var(--bq-t3)]">Responsável: {project.responsible?.name || 'Sem responsável'}</p>
          <span className="mt-2 inline-block rounded-md border border-dashed border-[var(--bq-hair-strong)] px-2 text-bq-text-metadata text-[var(--bq-t3)]">Tags ainda não disponíveis</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {firstConversationId ? <Link className="bq-button" href={`/inbox?conversationId=${firstConversationId}`}><MessageSquare size={13} />Abrir conversa</Link> : <Button disabled title="Nenhuma conversa vinculada">Abrir conversa</Button>}
          <Button variant="solid" disabled={phaseMutation.isPending || phaseIndex < 0 || phaseIndex >= PROJECT_STATUSES.length - 1} onClick={() => phaseMutation.mutate(PROJECT_STATUSES[phaseIndex + 1])}>Avançar fase<ChevronRight size={12} /></Button>

          {!embedded && <Button aria-label="Voltar" onClick={onBack ?? (() => router.push('/projects'))}><ArrowLeft size={13} /></Button>}
        </div>
      </header>
        <section className={cardCls}>
          <div className="flex flex-wrap items-center gap-2 text-[var(--bq-t2)] [&>h2]:text-[var(--bq-t1)]"><FileText size={14} className="text-[var(--bq-t2)]" /><h2 className="flex-1 text-bq-text-body font-semibold">Escopo do projeto</h2><button type="button" aria-label={editingScope ? 'Cancelar edição' : 'Editar escopo e dados'} className="flex items-center gap-1 text-xs text-[var(--bq-t2)]" onClick={() => { setName(project.name ?? ''); setDescription(project.description ?? ''); setHoppeId(project.hoppeId ?? ''); setResponsibleUserId(project.responsibleUserId ?? ''); setEditingScope(v => !v); }}><PenLine size={12} />{editingScope ? 'Cancelar' : 'Editar'}</button></div>
          {!editingScope && <><p className="max-w-bq-size-75ch whitespace-pre-wrap text-bq-text-body leading-bq-leading-prose text-[var(--bq-t1)]">{project.description || 'Escopo ainda não informado.'}</p>{project.hoppeId && <a className="bq-button mt-3" href={hoppeTaskUrl(project.hoppeId)} target="_blank" rel="noopener noreferrer">Abrir no Hoppe</a>}</>}
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
                className={`${inputCls} min-h-bq-size-prompt-plain resize-y`}
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
          <div className="flex flex-wrap gap-2"><Button onClick={() => router.push(`/projects/${projectId}`)}>Abrir página do projeto</Button><Button onClick={onBack ?? (() => router.push('/projects'))}>Voltar aos projetos</Button></div>
          </div>
        </section>
      <section className={cardCls}>
        <div className="flex flex-wrap items-center gap-2 text-[var(--bq-t2)] [&>h2]:text-[var(--bq-t1)]"><ListChecks size={14} /><h2 className="text-bq-text-body font-semibold">Fase em que está</h2><span className="font-[family-name:var(--bq-f-mono)] text-bq-text-auxiliary text-[var(--bq-t3)]">{phaseIndex >= 0 ? `${phaseIndex + 1}/${PROJECT_STATUSES.length}` : 'Fase não informada'}</span><button className="ml-auto text-xs text-[var(--bq-t2)]" onClick={() => setPanel('tasks')}>Ver tarefas</button></div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Fase atual do projeto">
          {PROJECT_STATUSES.map((status, index) => {
            const state = projectPhaseState(project.status, status);
            return <Fragment key={status}>{index > 0 && <ChevronRight size={12} className="text-[var(--bq-t3)]" />}<button type="button" aria-label={`${PHASE_LABELS[status]}: ${state}`} aria-pressed={state === 'atual'} disabled={phaseMutation.isPending} onClick={() => phaseMutation.mutate(status)} className={`flex h-bq-size-avatar-pipeline items-center gap-bq-space-control rounded-bq-radius-button border pl-1.5 pr-bq-space-panel text-xs ${state === 'atual' ? 'border-[var(--bq-accent)] bg-[var(--bq-accent-soft)] text-[var(--bq-t1)]' : 'border-[var(--bq-hair)] text-[var(--bq-t2)] hover:border-[var(--bq-hair-strong)]'}`}><span aria-hidden="true" className={`grid size-bq-size-phase-number place-items-center rounded-bq-radius-circle font-[family-name:var(--bq-f-mono)] leading-[normal] text-bq-text-phase-number font-semibold ${state === 'atual' ? 'bg-[var(--bq-unread-bg)] text-[var(--bq-on-accent)]' : state === 'concluída' ? 'bg-[var(--bq-ok-soft)] text-[var(--bq-ok)]' : 'bg-[var(--bq-raised-2)]'}`}>{state === 'concluída' ? <Check size={12} /> : index + 1}</span>{PHASE_LABELS[status]}</button></Fragment>;
          })}
        </div>
        <div data-task-progress className="flex items-center gap-2 text-bq-text-metadata text-[var(--bq-t3)]">{tasks.length ? <><progress aria-label="Progresso das tarefas" className="h-bq-size-status-dot min-w-0 flex-1 overflow-hidden rounded-bq-radius-progress [appearance:none] [&::-webkit-progress-bar]:bg-[var(--bq-raised-2)] [&::-webkit-progress-value]:bg-[var(--bq-ok)] [&::-moz-progress-bar]:bg-[var(--bq-ok)]" value={done} max={tasks.length} /><span>{done}/{tasks.length} tarefas concluídas</span></> : <span>Progresso indisponível · sem tarefas</span>}</div>
      </section>
      <section className={cardCls}>
        <div className="flex flex-wrap items-center gap-2 text-[var(--bq-t2)] [&>h2]:text-[var(--bq-t1)]"><Sparkles size={14} /><h2 className="flex-1 text-bq-text-body font-semibold">Fluxograma</h2><Button variant="agent" disabled>Refazer com o Jarvis</Button></div>
        <div className="flex min-h-[calc(var(--bq-size-project-list)+var(--bq-size-status-dot))] items-center justify-center rounded-xl border border-[var(--bq-hair)] bg-[radial-gradient(circle_at_var(--bq-space-hairline)_var(--bq-space-hairline),var(--bq-hair-strong)_var(--bq-space-hairline),transparent_var(--bq-border-checkbox))] bg-[length:var(--bq-size-icon)_var(--bq-size-icon)] p-5 text-center text-xs text-[var(--bq-t3)]">O fluxo deste projeto ainda não está disponível.</div>
      </section>
      <div data-project-blocks className="min-w-0 [columns:3_var(--bq-size-email-list)] gap-bq-space-section -mb-bq-space-section [&>section]:break-inside-avoid [&>section]:mb-bq-space-section">
        <section className={cardCls}>
          <div className="flex flex-wrap items-center gap-2 text-[var(--bq-t2)] [&>h2]:text-[var(--bq-t1)]"><Paperclip size={14} /><h2 className="text-bq-text-body font-semibold">Documentos</h2><span className="rounded-bq-radius-badge bg-[var(--bq-raised-2)] px-bq-space-compact py-bq-space-hairline font-[family-name:var(--bq-f-mono)] font-medium leading-[normal] text-bq-text-counter text-[var(--bq-t2)]">{attachments.length}</span><Button className="ml-auto" disabled title="Upload direto ainda não disponível"><Upload size={13} />Anexar</Button></div>
          {attachments.length === 0 ? (
            <p className="text-sm text-[var(--bq-t3)]">
              Nenhum anexo. Use o clipe na conversa para anexar uma mensagem.
            </p>
          ) : (
            <ul className="flex flex-col gap-bq-space-panel">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex min-w-0 items-center gap-bq-space-item"
                >
                  <span data-file-icon className={`grid w-bq-size-file-width h-bq-size-file-height shrink-0 place-items-center rounded-bq-radius-file text-bq-text-file-label leading-[normal] font-bold tracking-bq-tracking-file ${/\.pdf$/i.test(a.fileName || a.label || '') ? 'bg-[var(--bq-err-soft)] text-[var(--bq-err-text)]' : 'bg-[var(--bq-info-soft)] text-[var(--bq-info-text)]'}`}>
                    {/\.pdf$/i.test(a.fileName || a.label || '') ? 'PDF' : 'DOC'}
                  </span>
                  <div className="min-w-0 flex-1">
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-bq-text-row font-medium text-[var(--bq-t1)] hover:underline"
                      >
                        {a.label || a.fileName || 'Anexo'}
                      </a>
                    ) : (
                      <p className="truncate text-bq-text-row font-medium text-[var(--bq-t1)]">
                        {a.label || a.fileName || 'Anexo'}
                      </p>
                    )}
                    {a.fileName && a.label && a.fileName !== a.label && (
                      <p className="truncate text-bq-text-auxiliary text-[var(--bq-t3)]">
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
          <div className="flex flex-col items-center gap-bq-space-label rounded-xl border border-dashed border-[var(--bq-hair-strong)] p-3 text-center text-xs text-[var(--bq-t3)]"><Upload size={18} /><span>Arraste arquivos aqui ou <button type="button" disabled className="underline">escolha no computador</button></span><span>Upload direto ainda não disponível.</span>{firstConversationId && <Link className="underline" href={`/inbox?conversationId=${firstConversationId}`}>Anexar mensagem pela conversa</Link>}</div>
        </section>

        <section className={cardCls}>
          <div className="flex flex-wrap items-center gap-2 text-[var(--bq-t2)] [&>h2]:text-[var(--bq-t1)]"><Users size={14} /><h2 className="text-bq-text-body font-semibold">Contatos e grupos do contrato</h2><span className="rounded-bq-radius-badge bg-[var(--bq-raised-2)] px-bq-space-compact py-bq-space-hairline font-[family-name:var(--bq-f-mono)] font-medium leading-[normal] text-bq-text-counter text-[var(--bq-t2)]">{contacts.length}</span><button type="button" className="ml-auto text-[var(--bq-t2)]" aria-label="E-mail do projeto" onClick={() => setPanel('email')}><Mail size={14} /></button></div>
          {project.groupJid && <p className="mb-2 text-xs text-[var(--bq-t2)]">Grupo vinculado: {project.groupJid}</p>}
          <p className="mb-2 text-bq-text-metadata text-[var(--bq-t3)]">Incluir grupo ainda não disponível.</p>

          {contacts.length === 0 ? (
            <p className="text-sm text-[var(--bq-t3)]">Nenhum envolvido.</p>
          ) : (
            <ul className="flex flex-col gap-bq-space-panel">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex min-w-0 items-center gap-bq-space-item"
                >
                  <span style={{ '--bq-avatar-hue': mockupAvatarHue(c.name || c.phone || '?') } as CSSProperties}><Avatar className="bq-avatar-mockup bq-avatar-contact leading-[normal]" initials={(c.name || c.phone || '?').split(/\s+/).slice(0, 2).map(word => word[0]).join('')} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-bq-text-row font-medium text-[var(--bq-t1)]">
                      {c.name || c.phone || c.email || c.contactId}
                    </p>
                    <p className="break-words text-bq-text-auxiliary text-[var(--bq-t3)]">
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
          <div className="flex flex-wrap gap-2"><Button onClick={() => setPanel('contacts')}><Plus size={12} />Incluir contato</Button><Button disabled title="Vínculo de grupo ainda não disponível">Incluir grupo</Button></div>
        </section>

        <section className={cardCls}><div className="flex items-center gap-2 text-[var(--bq-t2)]"><Coins size={14} /><h2 className="text-bq-text-body font-semibold text-[var(--bq-t1)]">Contrato e honorários</h2></div><div className="flex flex-wrap items-baseline gap-bq-space-item"><span className="text-bq-text-detail-title font-medium font-[family-name:var(--bq-f-display)] tracking-bq-tracking-display">—</span><span className="text-xs text-[var(--bq-t3)]">Valor contratado ainda não disponível</span></div><p className="text-xs text-[var(--bq-t3)]">Contratos e assinaturas ainda não disponíveis.</p><Button className="self-start" disabled>Enviar contrato</Button></section>
        <section className={cardCls}><div className="flex flex-wrap items-center gap-2"><Calendar size={14} /><h2 className="flex-1 text-bq-text-body font-semibold">Reuniões</h2><Button disabled>Agendar</Button></div><p className="text-xs text-[var(--bq-t3)]">Histórico e agendamento pelo projeto ainda não disponíveis.</p></section>        <section className={cardCls}><div className="flex items-center gap-2 text-[var(--bq-t2)]"><Briefcase size={14} /><h2 className="text-bq-text-body font-semibold text-[var(--bq-t1)]">ClickUp</h2></div><div className="rounded-xl border border-[var(--bq-hair)] p-3"><p className="text-xs text-[var(--bq-t3)]">O caso vinculado a este projeto ainda não está disponível.</p><Button className="mt-3" disabled>Ver o caso</Button></div>{firstConversationId && <Link className="bq-button self-start" href={`/inbox?conversationId=${firstConversationId}`}>Abrir conversa do projeto</Link>}</section>
      </div>
      <MacWindow open={panel === 'tasks'} onClose={() => setPanel(null)} title="Tarefas do projeto">        <section className={cardCls}>

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
                    aria-label={task.title}
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

</MacWindow>
      <MacWindow open={panel === 'email'} onClose={() => setPanel(null)} title="E-mail do projeto">        <section className={cardCls}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--bq-t1)]">
            <Mail className="h-4 w-4 text-[var(--bq-accent-text)]" />
            E-mail
          </h2>
          <form
            className="flex flex-col gap-bq-space-panel"
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
</MacWindow>
      <MacWindow open={panel === 'contacts'} onClose={() => setPanel(null)} title="Incluir contato">
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (contactId) addContactMutation.mutate(); }}>
          <label className="block text-xs">Buscar contato<input className={`${inputCls} mt-1`} placeholder="Nome, telefone ou e-mail" value={contactSearch} onChange={e => setContactSearch(e.target.value)} /></label>
          {contactsLoading ? <p role="status">Buscando contatos…</p> : contactsError ? <p role="alert">Não foi possível buscar contatos. <Button onClick={() => void retryContacts()}>Tentar novamente</Button></p> : <div className="max-h-64 space-y-1 overflow-y-auto">{contactResults?.contacts.length ? contactResults.contacts.map(contact => <label key={contact.id} className="flex items-center gap-2 rounded-lg border border-[var(--bq-hair)] p-2 text-sm"><input type="radio" name="project-contact" value={contact.id} checked={contactId === contact.id} onChange={() => setContactId(contact.id)} />{contact.displayName || contact.name || contact.phone || contact.email || contact.id}</label>) : <p className="text-xs text-[var(--bq-t3)]">Nenhum contato encontrado.</p>}</div>}
          <div className="flex justify-end gap-2"><Button onClick={() => setPanel(null)}>Cancelar</Button><Button variant="solid" type="submit" disabled={!contactId || addContactMutation.isPending}>Ligar contato</Button></div>
        </form>
      </MacWindow>
    </div>
  );
}
