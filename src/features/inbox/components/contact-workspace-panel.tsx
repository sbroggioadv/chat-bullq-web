'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Phone,
  Copy,
  BellOff,
  ExternalLink,
  Search,
  Sparkles,
  ClipboardList,
  FolderKanban,
  Loader2,
  Mail,
  Paperclip,
  Send,
  User,
  X,
  ChevronDown,
  KanbanSquare,
  type LucideIcon,
} from 'lucide-react';
import { Button, Pill, Switch } from '@/components/ui/foundation';
import { PipelinePopover } from '@/features/inbox/components/pipeline-popover';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import { ClickUpPanel } from '@/features/inbox/components/clickup-panel';
import { toast } from 'sonner';
import { emailDeepLink, type Conversation } from '@/features/inbox/services/inbox.service';
import { ProjectPanel } from '@/features/inbox/components/project-panel';
import {
  emailService,
  fileToOutboundAttachment,
  MAX_OUTBOUND_ATTACHMENTS,
  MAX_OUTBOUND_ATTACHMENT_BYTES,
} from '@/features/email/services/email.service';
import { calendarService } from '@/features/calendar/services/calendar.service';
import { rememberRecipients } from '@/features/email/lib/recent-recipients';
import { EmailRichEditor } from '@/features/email/components/email-rich-editor';

type Tab = 'summary' | 'files' | 'notes' | 'negotiation' | 'contact' | 'email' | 'agenda' | 'project' | 'clickup';

interface ContactWorkspacePanelProps {
  conversation: Conversation;
  onClose: () => void;
}

/**
 * ADR-004 D6 — Contact Workspace: Contato | E-mail | Agenda | Projeto.
 * Substitui o painel só-projeto na inbox omnichannel.
 */
export function ContactWorkspacePanel({
  conversation,
  onClose,
}: ContactWorkspacePanelProps) {
  const isGroup = conversation.isGroup;
  const [openSections, setOpenSections] = useState<Set<Tab>>(() => new Set(['summary', 'negotiation']));
  const sectionRefs = useRef<Partial<Record<Tab, HTMLElement | null>>>({});
  const openSection = (id: Tab) => {
    setOpenSections(previous => new Set([...previous, id]));
    requestAnimationFrame(() => sectionRefs.current[id]?.scrollIntoView({ block: 'nearest' }));
  };
  const deals = useQuery({ queryKey: ['conversation-pipelines', conversation.id], queryFn: () => pipelinesService.listByConversation(conversation.id), staleTime: 30_000 });

  const contact = conversation.contact;
  const contactEmail =
    contact.email ||
    (contact.phone && contact.phone.includes('@') ? contact.phone : '') ||
    '';

  const tabs: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
    { id: 'summary', label: 'Resumo da conversa', icon: Sparkles },
    { id: 'negotiation', label: 'Negociação', icon: KanbanSquare },
    { id: 'files', label: 'Anexos', icon: Paperclip },
    { id: 'notes', label: 'Notas', icon: ClipboardList },
    { id: 'agenda', label: 'Reuniões', icon: CalendarDays },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'clickup', label: 'ClickUp', icon: ClipboardList },
    { id: 'project', label: 'Projeto · tarefas', icon: FolderKanban },
    { id: 'contact', label: 'Contato', icon: User },
  ];

  return (
    <aside className="bq-contact-panel" aria-label="Detalhes da conversa">
      <div className="bq-contact-heading">
        <span>Detalhes</span>
        <Button autoFocus aria-label="Fechar detalhes" onClick={onClose}><X size={14} /></Button>
      </div>
      <div className="bq-contact-profile text-center">
        <ProfileAvatar key={contact.avatarUrl} name={contact.name} url={contact.avatarUrl} />
        <h2>{contact.name || contact.phone || 'Contato'}</h2>
        <p>{contact.phone || 'Telefone não informado'}</p>
        <p className="break-all">{contactEmail || 'E-mail não informado'}</p>
        <div className="bq-contact-quick-actions">
          {contact.phone && !contact.phone.includes('@') ? <a href={`tel:${contact.phone}`}><span><Phone size={15} /></span>Ligar</a> : <button type="button" disabled title="Telefone não informado"><span><Phone size={15} /></span>Ligar</button>}
          <button type="button" disabled={!contact.phone} onClick={() => navigator.clipboard.writeText(contact.phone || '').then(() => toast.success('Contato copiado')).catch(() => toast.error('Não foi possível copiar'))}><span><Copy size={15} /></span>Copiar</button>
          <button type="button" disabled title="Silenciar ainda não disponível"><span><BellOff size={15} /></span>Silenciar</button>
          <button type="button" onClick={() => openSection('contact')}><span><ExternalLink size={15} /></span>Ficha</button>
        </div>
        {!!contact.tags?.length && <div className="mt-3 flex flex-wrap justify-center gap-1">{contact.tags.map(({tag}) => <Pill key={tag.id}>{tag.name}</Pill>)}</div>}
      </div>
      <button type="button" className="bq-contact-deal" onClick={() => openSection('negotiation')}>
        <KanbanSquare size={13} /><span>{deals.data?.[0] ? `${deals.data[0].pipeline.name} · ${deals.data[0].stage.name}` : deals.isLoading ? 'Carregando negociação…' : deals.isError ? 'Negociação indisponível' : 'Sem negociação vinculada'}</span>
      </button>
      <div className="bq-contact-incoming"><div><b>Entra no Incoming</b><p>Disponível após o piloto Incoming.</p></div><Switch label="Incoming ainda não disponível" checked={false} disabled onChange={() => {}} /></div>
      <label className="bq-contact-find"><Search size={14} /><input disabled placeholder="Busca na conversa indisponível" aria-label="Busca completa na conversa ainda não disponível" /></label>
      {tabs.map(({id: tab, label, icon: Icon}) => <section key={tab} ref={element => { sectionRefs.current[tab] = element; }} className="bq-contact-section">
        <button type="button" aria-label={tab === 'agenda' ? 'Reuniões · Agenda' : undefined} aria-expanded={openSections.has(tab)} aria-controls={`contact-section-${tab}`} onClick={() => setOpenSections(previous => { const next = new Set(previous); if (next.has(tab)) next.delete(tab); else next.add(tab); return next; })}><Icon size={14} />{label}<ChevronDown size={14} className={openSections.has(tab) ? 'rotate-180' : ''} /></button>
        {openSections.has(tab) && <div id={`contact-section-${tab}`}>
        {tab === 'summary' && <div className="bq-contact-summary">Resumo de contexto ainda não disponível para esta conversa.</div>}
        {tab === 'notes' && <p className="px-4 pb-4 text-xs text-[var(--bq-t3)]">Notas internas ainda não disponíveis.</p>}
        {tab === 'files' && <p className="px-4 pb-4 text-xs text-[var(--bq-t3)]">Índice completo de anexos ainda não disponível. Os arquivos recebidos continuam acessíveis nas mensagens e no projeto vinculado.</p>}
        {tab === 'negotiation' && <NegotiationTab conversation={conversation} />}
        {tab === 'contact' && (
          <div className="space-y-3 p-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                Nome
              </p>
              <p className="text-sm text-[var(--bq-t1)] ">
                {contact.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                Telefone
              </p>
              <p className="text-sm text-[var(--bq-t1)] ">
                {contact.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                E-mail
              </p>
              <p className="text-sm text-[var(--bq-t1)] ">
                {contactEmail || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)]">
                Canal
              </p>
              <p className="text-sm text-[var(--bq-t1)] ">
                {conversation.channel.name} · {conversation.channel.type}
              </p>
            </div>
            {emailDeepLink(conversation) && (
              <a
                href={emailDeepLink(conversation)!}
                className="inline-flex text-xs font-medium text-primary hover:underline"
              >
                Abrir no E-mail →
              </a>
            )}
          </div>
        )}

        {tab === 'email' && (
          <EmailComposeTab
            defaultTo={contactEmail}
            contactName={contact.name || contact.phone || 'contato'}
          />
        )}

        {tab === 'agenda' && (
          <AgendaTab
            conversationId={conversation.id}
            defaultAttendee={contactEmail}
            contactName={contact.name || ''}
          />
        )}

        {tab === 'project' && (
          <div className="h-full [&_aside]:w-full [&_aside]:border-0">
            <ProjectPanel conversationId={conversation.id} onClose={onClose} />
          </div>
        )}

        {tab === 'clickup' && (
          <ClickUpPanel
            conversationId={conversation.id}
            contactName={contact.name || ''}
            isGroup={isGroup}
          />
        )}
        </div>}
      </section>)}
    </aside>
  );
}

function ProfileAvatar({ name, url }: { name: string | null; url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) return <img className="bq-contact-avatar" src={url} alt={name || 'Contato'} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  return <div className="bq-contact-avatar">{(name || '?').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>;
}

function EmailComposeTab({
  defaultTo,
  contactName,
}: {
  defaultTo: string;
  contactName: string;
}) {
  const statusQ = useQuery({
    queryKey: ['email-status'],
    queryFn: () => emailService.status(),
    staleTime: 60_000,
  });
  const channelId = statusQ.data?.channels[0]?.id;
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  const addPendingFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setPendingFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_OUTBOUND_ATTACHMENTS) {
          toast.error(`No máximo ${MAX_OUTBOUND_ATTACHMENTS} anexos`);
          break;
        }
        if (f.size > MAX_OUTBOUND_ATTACHMENT_BYTES) {
          toast.error(`"${f.name}" excede 8 MB`);
          continue;
        }
        if (next.some((p) => p.name === f.name && p.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const send = async () => {
    if (!channelId) {
      toast.error('Conecte um canal Gmail em Canais');
      return;
    }
    if (!to.includes('@') || !subject.trim() || !body.trim()) {
      toast.error('Preencha destinatário, assunto e corpo');
      return;
    }
    setSending(true);
    try {
      rememberRecipients(to);
      const attachments =
        pendingFiles.length > 0
          ? await Promise.all(pendingFiles.map((f) => fileToOutboundAttachment(f)))
          : undefined;
      await emailService.compose({
        channelId,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        bodyHtml: bodyHtml.trim() || undefined,
        attachments,
      });
      toast.success(`E-mail enviado para ${contactName}`);
      setBody('');
      setBodyHtml('');
      setPendingFiles([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  };

  if (statusQ.isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--bq-t3)]" />
      </div>
    );
  }

  if (!channelId) {
    return (
      <p className="p-4 text-xs text-[var(--bq-t2)]">
        Nenhum Gmail conectado. Vá em Canais → Conectar Gmail.
      </p>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Para"
        className="w-full rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs  "
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Assunto"
        className="w-full rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs  "
      />
      <EmailRichEditor
        valueHtml={bodyHtml}
        onChange={(html, plain) => {
          setBodyHtml(html);
          setBody(plain);
        }}
        rows={8}
        disabled={sending}
        placeholder="Escreva o e-mail…"
      />
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${f.size}-${i}`}
              className="inline-flex max-w-full items-center gap-1 rounded border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-1.5 py-0.5 text-[10px] text-[var(--bq-t2)]   "
            >
              <Paperclip className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remover ${f.name}`}
                onClick={() =>
                  setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="rounded p-0.5 text-[var(--bq-t3)] hover:bg-[var(--bq-raised-2)] "
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addPendingFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || pendingFiles.length >= MAX_OUTBOUND_ATTACHMENTS}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-win-solid)] px-2 py-1.5 text-[11px] font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)] disabled:opacity-50   "
        >
          <Paperclip className="h-3 w-3" />
          Anexar
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={send}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar e-mail
        </button>
      </div>
    </div>
  );
}

function AgendaTab({
  conversationId,
  defaultAttendee,
  contactName,
}: {
  conversationId: string;
  defaultAttendee: string;
  contactName: string;
}) {
  const queryClient = useQueryClient();
  const statusQ = useQuery({
    queryKey: ['calendar-status'],
    queryFn: () => calendarService.status(),
    staleTime: 60_000,
  });
  const calsQ = useQuery({
    queryKey: ['calendar-list', statusQ.data?.channelId],
    queryFn: () =>
      calendarService.calendars(statusQ.data?.channelId || undefined),
    enabled: !!statusQ.data?.connected && !statusQ.data?.needsReauthForCalendar,
    staleTime: 60_000,
  });
  const calendars = calsQ.data?.calendars || [];
  const defaultCal =
    calendars.find((c) => c.primary)?.id || calendars[0]?.id || 'primary';

  const [summary, setSummary] = useState(
    contactName ? `Reunião com ${contactName}` : 'Reunião',
  );
  const [minutes, setMinutes] = useState(30);
  const [withMeet, setWithMeet] = useState(true);
  const [chosenCalendar, setCalendarId] = useState<string | null>(null);
  const calendarId = chosenCalendar ?? defaultCal;
  const [creating, setCreating] = useState(false);
  const [lastMeet, setLastMeet] = useState<string | null>(null);


  const startDefault = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, []);

  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date(startDefault.getTime() - startDefault.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  });

  const create = async () => {
    if (!statusQ.data?.connected) {
      toast.error('Conecte o Google em Canais');
      return;
    }
    if (statusQ.data.needsReauthForCalendar) {
      toast.error('Reconecte o Google autorizando a Agenda');
      return;
    }
    setCreating(true);
    try {
      const start = new Date(startLocal);
      if (!Number.isFinite(start.getTime())) throw new Error('Informe a data e a hora da reunião');
      const end = new Date(start.getTime() + minutes * 60_000);
      const res = await calendarService.createFromConversation({
        conversationId,
        channelId: statusQ.data.channelId || undefined,
        calendarId,
        summary: summary.trim() || 'Reunião',
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        withMeet,
        attendeeEmails: defaultAttendee.includes('@')
          ? [defaultAttendee]
          : [],
      });
      setLastMeet(res.meetLink || null);
      // Bolha SYSTEM na conversa (local) — não manda pro WhatsApp/IG
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(
        res.meetLink
          ? 'Agendado no Google · Meet na conversa (bolha do sistema)'
          : 'Agendado no Google · nota na conversa',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao agendar');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-[var(--bq-t2)]">
        Agende no Google e guarde o link nesta conversa.
      </p>
      <label className="block text-xs">Data e hora<input type="datetime-local" value={startLocal} onChange={e => setStartLocal(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-raised)] p-2" /></label>
      <p className="text-[11px] text-[var(--bq-t3)]">Histórico de reuniões desta conversa ainda não disponível. Consulte a Agenda completa.</p>
      <input
        aria-label="Título da reunião"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="w-full rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs  "
      />
      <select
        aria-label="Calendário"
        value={calendarId}
        onChange={(e) => setCalendarId(e.target.value)}
        className="w-full rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs  "
      >
        {(calendars.length
          ? calendars
          : [{ id: 'primary', summary: 'Principal', backgroundColor: '', foregroundColor: '' }]
        ).map((c) => (
          <option key={c.id} value={c.id}>
            {c.summary}
            {c.primary ? ' (principal)' : ''}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        {[15, 30, 45, 60].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(m)}
            className={`rounded-md px-2 py-1 text-[11px] ${
              minutes === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-[var(--bq-raised)] text-[var(--bq-t2)]  '
            }`}
          >
            {m}m
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--bq-t2)] ">
        <input
          type="checkbox"
          checked={withMeet}
          onChange={(e) => setWithMeet(e.target.checked)}
        />
        Google Meet
      </label>

      {defaultAttendee ? (
        <p className="text-[11px] text-[var(--bq-t3)]">Convidado: {defaultAttendee}</p>
      ) : (
        <p className="text-[11px] text-[var(--bq-warn)]">
          Contato sem e-mail — evento só na sua agenda.
        </p>
      )}
      {!statusQ.data?.connected && <p className="text-xs text-[var(--bq-t3)]">Conecte o Google em Configurações → Canais para agendar.</p>}
      {statusQ.data?.needsReauthForCalendar && <p className="text-xs text-[var(--bq-warn)]">Reconecte o Google autorizando a Agenda.</p>}
      {lastMeet && (
        <a
          href={lastMeet}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[11px] text-[var(--bq-info)] hover:underline"
        >
          Abrir Meet →
        </a>
      )}
      <button
        type="button"
        disabled={creating || !statusQ.data?.connected || !!statusQ.data?.needsReauthForCalendar}
        onClick={create}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Agendar no Google
      </button>
      <a
        href="/calendar"
        className="block text-center text-[11px] text-primary hover:underline"
      >
        Abrir Agenda completa →
      </a>
    </div>
  );
}

function NegotiationTab({ conversation }: { conversation: Conversation }) {
  const cards = useQuery({ queryKey: ['conversation-pipelines', conversation.id], queryFn: () => pipelinesService.listByConversation(conversation.id), staleTime: 30_000 });
  return <div className="space-y-3 px-4 pb-4 text-xs">
    {cards.isLoading ? <p>Carregando negociação…</p> : cards.isError ? <p role="alert">Não foi possível carregar a negociação.</p> : cards.data?.length ? cards.data.map(card => <NegotiationCard key={card.id} card={card} />) : <p className="text-[var(--bq-t3)]">Nenhuma negociação vinculada a esta conversa.</p>}
    <PipelinePopover conversation={conversation} />
    <p className="text-[var(--bq-t3)]">Jornada de diagnóstico, proposta e contrato ainda não disponível aqui.</p>
  </div>;
}

function NegotiationCard({ card }: { card: ConversationCard }) {
  const board = useQuery({ queryKey: ['pipeline-board', card.pipelineId], queryFn: () => pipelinesService.getBoard(card.pipelineId), staleTime: 30_000 });
  const detail = Object.values(board.data?.cards ?? {}).flat().find(item => item.id === card.id);
  const value = detail?.value;
  return <div className="space-y-2 rounded-xl border border-[var(--bq-hair)] p-3">
    <p className="font-semibold">{detail?.title || card.pipeline.name}</p>
    <p className="text-[var(--bq-t3)]">{card.pipeline.name}</p><Pill>{card.stage.name}</Pill>
    <p>{value == null ? 'Valor não informado' : `${detail?.currency || 'BRL'} ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}</p>
    <p className="text-[var(--bq-t3)]">{card.status === 'WON' ? 'Fechado' : card.status === 'LOST' ? 'Perdido' : 'Em negociação'}</p>
    {detail?.closedReason && <p>{detail.closedReason}</p>}
    {board.isError && <p role="alert">Não foi possível carregar os detalhes.</p>}
  </div>;
}
